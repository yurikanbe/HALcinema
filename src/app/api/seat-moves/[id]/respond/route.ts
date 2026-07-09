import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { asBigIntId, optionalBigIntId } from '@/lib/api/bookingPayload';
import { jsonError, jsonOk } from '@/lib/api/response';
import { getSessionUser } from '@/lib/api/session';
import {
  ensureRequesterBookingAllowsSeatMove,
  ensureScreeningAllowsSeatMove,
  ensureTargetBookingAllowsSeatMove,
  SeatMoveGuardError,
} from '@/lib/api/seatMoveGuards';
import {
  cascadeCancelRequesterMoves,
  ensureRequesterPendingBooking,
  linkPendingMovesToBooking,
  recalculateBookingTotalAmount,
  refundFullBookingOnTransferDecline,
  refundInactiveMoveFeesForBooking,
} from '@/lib/api/seatMoveService';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface RespondPayload {
  action?: 'decline' | 'approve_reseat' | 'approve_cancel';
  newSeatId?: string | number;
}

export async function POST(request: Request, context: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return jsonError('譲渡リクエストに応答するにはログインしてください', 401);
  }

  const { id } = await context.params;
  const requestId = asBigIntId(id, 'id');

  let payload: RespondPayload;
  try {
    payload = await request.json();
  } catch {
    return jsonError('Request body must be JSON', 400);
  }

  const newSeatId = payload.action === 'approve_reseat'
    ? optionalBigIntId(payload.newSeatId, 'newSeatId')
    : null;
  if (payload.action === 'approve_reseat' && !newSeatId) {
    return jsonError('別席への移動には newSeatId が必要です', 400);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const seatMoveRequest = await tx.seatMoveRequest.findUnique({
        where: { id: requestId },
        include: {
          targetBooking: { include: { screening: { select: { startTime: true, id: true } } } },
          requesterBooking: true,
          targetBookingSeat: true,
          requesterBookingSeat: true,
        },
      });
      if (!seatMoveRequest) throw new Error('リクエストが見つかりません');
      if (seatMoveRequest.targetBooking.userId !== sessionUser.id) {
        throw new Error('このリクエストの受信者ではありません');
      }
      if (seatMoveRequest.status !== 'PENDING') {
        throw new Error('このリクエストはすでに処理されています');
      }

      await ensureScreeningAllowsSeatMove(seatMoveRequest.screeningId);
      ensureTargetBookingAllowsSeatMove(seatMoveRequest.targetBooking.status);
      if (seatMoveRequest.requesterBooking) {
        ensureRequesterBookingAllowsSeatMove(seatMoveRequest.requesterBooking.status);
      }

      const screeningId = seatMoveRequest.screeningId;
      const requesterUserId = seatMoveRequest.requesterUserId;

      if (payload.action === 'decline') {
        await tx.seatMoveRequest.update({
          where: { id: requestId },
          data: { status: 'DECLINED', respondedAt: new Date() },
        });
        await cascadeCancelRequesterMoves(tx, {
          screeningId,
          requesterUserId,
          requesterBookingId: seatMoveRequest.requesterBookingId,
          excludeRequestId: requestId,
        });
        const refunded = await refundFullBookingOnTransferDecline(
          tx,
          seatMoveRequest.requesterBookingId,
        );
        return { declined: true, refunded };
      }

      if (!requesterUserId) {
        throw new Error('依頼者情報が見つかりません');
      }

      let requesterBookingId = seatMoveRequest.requesterBookingId;
      if (!requesterBookingId) {
        const pendingBooking = await ensureRequesterPendingBooking(tx, {
          userId: requesterUserId,
          screeningId,
        });
        requesterBookingId = pendingBooking.id;
        await tx.seatMoveRequest.update({
          where: { id: requestId },
          data: { requesterBookingId },
        });
        await linkPendingMovesToBooking(tx, {
          userId: requesterUserId,
          screeningId,
          bookingId: requesterBookingId,
        });
      }

      const requesterBooking = await tx.booking.findUnique({
        where: { id: requesterBookingId },
      });
      if (!requesterBooking) throw new Error('依頼者の予約が見つかりません');
      ensureRequesterBookingAllowsSeatMove(requesterBooking.status);

      const existingSeat = await tx.bookingSeat.findFirst({
        where: {
          bookingId: requesterBookingId,
          seatId: seatMoveRequest.targetBookingSeat.seatId,
        },
      });
      if (!existingSeat) {
        await tx.bookingSeat.create({
          data: {
            bookingId: requesterBookingId,
            screeningId,
            seatId: seatMoveRequest.targetBookingSeat.seatId,
            ticketTypeId:
              seatMoveRequest.prepaidTicketTypeId ?? seatMoveRequest.targetBookingSeat.ticketTypeId,
            unitPrice:
              seatMoveRequest.prepaidUnitPrice ?? seatMoveRequest.targetBookingSeat.unitPrice,
          },
        });
      }

      const heldLock = await tx.screeningSeatLock.findFirst({
        where: { screeningId, seatId: seatMoveRequest.targetBookingSeat.seatId },
      });
      if (heldLock) {
        await tx.screeningSeatLock.update({
          where: { id: heldLock.id },
          data: {
            bookingId: requesterBookingId,
            userId: requesterUserId,
            status: 'HELD',
            expiresAt: requesterBooking.expiresAt,
          },
        });
      } else {
        await tx.screeningSeatLock.create({
          data: {
            screeningId,
            seatId: seatMoveRequest.targetBookingSeat.seatId,
            userId: requesterUserId,
            bookingId: requesterBookingId,
            status: 'HELD',
            expiresAt: requesterBooking.expiresAt,
          },
        });
      }

      if (payload.action === 'approve_cancel') {
        await tx.screeningSeatLock.deleteMany({
          where: {
            bookingId: seatMoveRequest.targetBookingId,
            seatId: seatMoveRequest.targetBookingSeat.seatId,
          },
        });
        await tx.bookingSeat.delete({
          where: { id: seatMoveRequest.targetBookingSeatId },
        });
        const remainingSeats = await tx.bookingSeat.count({
          where: { bookingId: seatMoveRequest.targetBookingId },
        });
        if (remainingSeats === 0) {
          await tx.booking.update({
            where: { id: seatMoveRequest.targetBookingId },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
              paymentStatus:
                seatMoveRequest.targetBooking.paymentStatus === 'COMPLETED' ? 'REFUNDED' : 'FAILED',
            },
          });
        } else {
          const targetTotal = await tx.bookingSeat.aggregate({
            where: { bookingId: seatMoveRequest.targetBookingId },
            _sum: { unitPrice: true },
          });
          await tx.booking.update({
            where: { id: seatMoveRequest.targetBookingId },
            data: { totalAmount: targetTotal._sum.unitPrice ?? 0 },
          });
        }
      } else if (payload.action === 'approve_reseat' && newSeatId) {
        const takenLock = await tx.screeningSeatLock.findFirst({
          where: {
            screeningId,
            seatId: newSeatId,
            status: { in: ['CONFIRMED', 'HELD'] },
          },
        });
        if (takenLock) throw new Error('選択した席はすでに確保されています');

        await tx.bookingSeat.update({
          where: { id: seatMoveRequest.targetBookingSeatId },
          data: { seatId: newSeatId },
        });
        await tx.screeningSeatLock.updateMany({
          where: { screeningId, seatId: seatMoveRequest.targetBookingSeat.seatId },
          data: { seatId: newSeatId },
        });
      } else {
        throw new Error('無効な操作です');
      }

      await recalculateBookingTotalAmount(tx, requesterBookingId);

      await tx.seatMoveRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED', respondedAt: new Date() },
      });
      await cascadeCancelRequesterMoves(tx, {
        screeningId,
        requesterUserId,
        requesterBookingId,
        excludeRequestId: requestId,
      });
      const refunded = await refundInactiveMoveFeesForBooking(tx, requesterBookingId);

      return { approved: true, requesterBookingId: requesterBookingId.toString(), refunded };
    }, { timeout: 15000 });

    return jsonOk(result);
  } catch (error) {
    if (error instanceof SeatMoveGuardError) {
      return jsonError(error.message, error.status);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return jsonError('選択した席はすでに確保されています', 409);
    }
    return jsonError(error instanceof Error ? error.message : 'リクエストの処理に失敗しました', 400);
  }
}
