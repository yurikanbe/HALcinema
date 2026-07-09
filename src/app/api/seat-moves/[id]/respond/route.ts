import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { asBigIntId, optionalBigIntId } from '@/lib/api/bookingPayload';
import { jsonError, jsonOk } from '@/lib/api/response';
import { getSessionUser } from '@/lib/api/session';
import {
  ensureBookingAllowsSeatMove,
  ensureScreeningAllowsSeatMove,
  SeatMoveGuardError,
} from '@/lib/api/seatMoveGuards';

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
    return jsonError('Sign in to respond to a seat exchange request', 401);
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
    return jsonError('newSeatId is required to reseat', 400);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const seatMoveRequest = await tx.seatMoveRequest.findUnique({
        where: { id: requestId },
        include: {
          targetBooking: { include: { screening: { select: { startTime: true } } } },
          requesterBooking: true,
          targetBookingSeat: true,
          requesterBookingSeat: true,
        },
      });
      if (!seatMoveRequest) throw new Error('Request not found');
      if (seatMoveRequest.targetBooking.userId !== sessionUser.id) {
        throw new Error('You are not the recipient of this request');
      }
      if (seatMoveRequest.status !== 'PENDING') {
        throw new Error('This request has already been responded to');
      }

      ensureBookingAllowsSeatMove(seatMoveRequest.requesterBooking.status);
      ensureBookingAllowsSeatMove(seatMoveRequest.targetBooking.status);
      if (seatMoveRequest.targetBooking.screening.startTime <= new Date()) {
        throw new SeatMoveGuardError('席交換は上映開始前のみ利用できます', 400);
      }

      if (payload.action === 'decline') {
        await tx.seatMoveRequest.update({
          where: { id: requestId },
          data: { status: 'DECLINED', respondedAt: new Date() },
        });
        await tx.seatMoveRequest.updateMany({
          where: {
            requesterBookingId: seatMoveRequest.requesterBookingId,
            targetBooking: { screeningId: seatMoveRequest.targetBooking.screeningId },
            status: 'PENDING',
            id: { not: requestId },
          },
          data: { status: 'CANCELLED', respondedAt: new Date() },
        });
        return { declined: true };
      }

      const screeningId = seatMoveRequest.targetBooking.screeningId;

      // 承諾: リクエスター側にtarget座席を付与
      if (seatMoveRequest.requesterBookingSeatId && seatMoveRequest.requesterBookingSeat) {
        await tx.bookingSeat.update({
          where: { id: seatMoveRequest.requesterBookingSeatId },
          data: { seatId: seatMoveRequest.targetBookingSeat.seatId },
        });
        await tx.screeningSeatLock.updateMany({
          where: { screeningId, seatId: seatMoveRequest.requesterBookingSeat.seatId },
          data: { seatId: seatMoveRequest.targetBookingSeat.seatId },
        });
      } else {
        await tx.bookingSeat.create({
          data: {
            bookingId: seatMoveRequest.requesterBookingId,
            screeningId,
            seatId: seatMoveRequest.targetBookingSeat.seatId,
            ticketTypeId: seatMoveRequest.targetBookingSeat.ticketTypeId,
            unitPrice: seatMoveRequest.targetBookingSeat.unitPrice,
          },
        });
      }

      if (payload.action === 'approve_cancel') {
        await tx.screeningSeatLock.deleteMany({ where: { bookingId: seatMoveRequest.targetBookingId } });
        await tx.booking.update({
          where: { id: seatMoveRequest.targetBookingId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            paymentStatus: seatMoveRequest.targetBooking.paymentStatus === 'COMPLETED' ? 'REFUNDED' : 'FAILED',
          },
        });
      } else if (payload.action === 'approve_reseat' && newSeatId) {
        const takenLock = await tx.screeningSeatLock.findFirst({
          where: { screeningId, seatId: newSeatId, status: 'CONFIRMED' },
        });
        if (takenLock) throw new Error('Selected seat is already taken');

        await tx.bookingSeat.update({
          where: { id: seatMoveRequest.targetBookingSeatId },
          data: { seatId: newSeatId },
        });
        await tx.screeningSeatLock.updateMany({
          where: { screeningId, seatId: seatMoveRequest.targetBookingSeat.seatId },
          data: { seatId: newSeatId },
        });
      } else {
        throw new Error('Invalid action');
      }

      await tx.seatMoveRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED', respondedAt: new Date() },
      });
      await tx.seatMoveRequest.updateMany({
        where: {
          requesterBookingId: seatMoveRequest.requesterBookingId,
          targetBooking: { screeningId },
          status: 'PENDING',
          id: { not: requestId },
        },
        data: { status: 'CANCELLED', respondedAt: new Date() },
      });

      return { approved: true };
    }, { timeout: 15000 });

    return jsonOk(result);
  } catch (error) {
    if (error instanceof SeatMoveGuardError) {
      return jsonError(error.message, error.status);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return jsonError('Selected seat is already taken', 409);
    }
    return jsonError(error instanceof Error ? error.message : 'Failed to respond to request', 400);
  }
}
