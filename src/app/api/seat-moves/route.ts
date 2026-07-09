import { prisma } from '@/lib/prisma';
import { asBigIntId } from '@/lib/api/bookingPayload';
import { jsonError, jsonOk } from '@/lib/api/response';
import { getSessionUser } from '@/lib/api/session';
import {
  ensureScreeningAllowsSeatMove,
  ensureTargetBookingAllowsSeatMove,
  SeatMoveGuardError,
} from '@/lib/api/seatMoveGuards';
import { SEAT_MOVE_CASHBACK, SEAT_MOVE_FEE } from '@/lib/api/seatMoveService';

interface CreateSeatMoveRequestPayload {
  screeningId?: string | number;
  targetBookingSeatId?: string | number;
}

function serializeSeatMoveRequest(request: {
  id: bigint;
  status: string;
  fee: number;
  cashbackAmount: number;
  requestedAt: Date;
  respondedAt: Date | null;
  screeningId: bigint;
  requesterBookingId: bigint | null;
  targetBookingSeat: { id: bigint; seat: { rowLabel: string; seatNumber: number } };
}) {
  return {
    id: request.id.toString(),
    status: request.status,
    fee: request.fee,
    cashbackAmount: request.cashbackAmount,
    requestedAt: request.requestedAt.toISOString(),
    respondedAt: request.respondedAt?.toISOString() ?? null,
    screeningId: request.screeningId.toString(),
    requesterBookingId: request.requesterBookingId?.toString() ?? null,
    targetBookingSeatId: request.targetBookingSeat.id.toString(),
    seatLabel: `${request.targetBookingSeat.seat.rowLabel}${request.targetBookingSeat.seat.seatNumber}`,
  };
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return jsonError('譲渡リクエストを確認するにはログインしてください', 401);
  }

  const { searchParams } = new URL(request.url);
  const screeningIdParam = searchParams.get('screeningId');
  if (!screeningIdParam) {
    return jsonError('screeningId is required', 400);
  }

  const screeningId = asBigIntId(screeningIdParam, 'screeningId');

  const requests = await prisma.seatMoveRequest.findMany({
    where: {
      requesterUserId: sessionUser.id,
      screeningId,
      status: { in: ['PENDING', 'APPROVED', 'DECLINED', 'CANCELLED', 'EXPIRED'] },
    },
    include: {
      targetBookingSeat: { include: { seat: true } },
    },
    orderBy: { requestedAt: 'asc' },
  });

  const pendingBooking = await prisma.booking.findFirst({
    where: {
      userId: sessionUser.id,
      screeningId,
      status: 'PENDING',
      paymentStatus: 'UNPAID',
    },
    include: {
      bookingSeats: {
        include: { seat: true, ticketType: true },
      },
    },
  });

  const otherPendingMoves = await prisma.seatMoveRequest.findMany({
    where: {
      screeningId,
      status: 'PENDING',
      NOT: { requesterUserId: sessionUser.id },
    },
    include: {
      targetBookingSeat: { include: { seat: true } },
    },
  });

  const blockedSeatLabels = otherPendingMoves.map(
    (move) => `${move.targetBookingSeat.seat.rowLabel}${move.targetBookingSeat.seat.seatNumber}`,
  );

  return jsonOk({
    requests: requests.map(serializeSeatMoveRequest),
    blockedSeatLabels,
    pendingBooking: pendingBooking
      ? {
          id: pendingBooking.id.toString(),
          bookingSeats: pendingBooking.bookingSeats.map((seat) => ({
            id: seat.id.toString(),
            seatLabel: `${seat.seat.rowLabel}${seat.seat.seatNumber}`,
            unitPrice: seat.unitPrice,
            ticketType: { nameJa: seat.ticketType.nameJa },
          })),
        }
      : null,
  });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return jsonError('譲渡リクエストを送るにはログインしてください', 401);
  }

  let payload: CreateSeatMoveRequestPayload;
  try {
    payload = await request.json();
  } catch {
    return jsonError('Request body must be JSON', 400);
  }

  let screeningId: bigint;
  let targetBookingSeatId: bigint;
  try {
    screeningId = asBigIntId(payload.screeningId, 'screeningId');
    targetBookingSeatId = asBigIntId(payload.targetBookingSeatId, 'targetBookingSeatId');
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Invalid request body', 400);
  }

  try {
    await ensureScreeningAllowsSeatMove(screeningId);
  } catch (error) {
    if (error instanceof SeatMoveGuardError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }

  const targetBookingSeat = await prisma.bookingSeat.findUnique({
    where: { id: targetBookingSeatId },
    include: { booking: true, seat: true },
  });
  if (!targetBookingSeat || targetBookingSeat.booking.status === 'CANCELLED') {
    return jsonError('対象の席が見つかりません', 404);
  }
  if (targetBookingSeat.screeningId !== screeningId) {
    return jsonError('対象の席はこの上映回に属していません', 400);
  }

  try {
    ensureTargetBookingAllowsSeatMove(targetBookingSeat.booking.status);
    await ensureScreeningAllowsSeatMove(targetBookingSeat.screeningId);
  } catch (error) {
    if (error instanceof SeatMoveGuardError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }

  if (targetBookingSeat.booking.userId === sessionUser.id) {
    return jsonError('ご自身の席には譲渡リクエストを送れません', 400);
  }

  const seatTaken = await prisma.seatMoveRequest.findFirst({
    where: { targetBookingSeatId, status: 'PENDING' },
  });
  if (seatTaken) {
    return jsonError('この席にはすでに譲渡リクエストが入っています', 409);
  }

  const duplicate = await prisma.seatMoveRequest.findFirst({
    where: {
      requesterUserId: sessionUser.id,
      targetBookingSeatId,
      status: 'PENDING',
    },
  });
  if (duplicate) {
    return jsonError('この席への譲渡リクエストはすでに送信済みです', 409);
  }

  const seatMoveRequest = await prisma.seatMoveRequest.create({
    data: {
      requesterUserId: sessionUser.id,
      screeningId,
      targetBookingSeatId,
      targetBookingId: targetBookingSeat.bookingId,
      requesterBookingId: null,
      requesterBookingSeatId: null,
      fee: SEAT_MOVE_FEE,
      cashbackAmount: SEAT_MOVE_CASHBACK,
      status: 'PENDING',
    },
    include: {
      targetBookingSeat: { include: { seat: true } },
    },
  });

  return jsonOk({ seatMoveRequest: serializeSeatMoveRequest(seatMoveRequest) }, { status: 201 });
}
