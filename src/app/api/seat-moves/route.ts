import { prisma } from '@/lib/prisma';
import { asBigIntId, optionalBigIntId } from '@/lib/api/bookingPayload';
import { jsonError, jsonOk } from '@/lib/api/response';
import { getSessionUser } from '@/lib/api/session';
import {
  ensureBookingAllowsSeatMove,
  ensureScreeningAllowsSeatMove,
  SeatMoveGuardError,
} from '@/lib/api/seatMoveGuards';

const FEE = 100;
const CASHBACK = 100;

interface CreateSeatMoveRequestPayload {
  requesterBookingId?: string | number;
  requesterBookingSeatId?: string | number | null;
  targetBookingSeatId?: string | number;
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return jsonError('Sign in to request a seat exchange', 401);
  }

  let payload: CreateSeatMoveRequestPayload;
  try {
    payload = await request.json();
  } catch {
    return jsonError('Request body must be JSON', 400);
  }

  let requesterBookingId: bigint;
  let requesterBookingSeatId: bigint | null;
  let targetBookingSeatId: bigint;
  try {
    requesterBookingId = asBigIntId(payload.requesterBookingId, 'requesterBookingId');
    requesterBookingSeatId = optionalBigIntId(payload.requesterBookingSeatId, 'requesterBookingSeatId');
    targetBookingSeatId = asBigIntId(payload.targetBookingSeatId, 'targetBookingSeatId');
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Invalid request body', 400);
  }

  const requesterBooking = await prisma.booking.findUnique({
    where: { id: requesterBookingId },
    include: { bookingSeats: true, screening: { select: { startTime: true } } },
  });
  if (!requesterBooking || requesterBooking.userId !== sessionUser.id) {
    return jsonError('Booking not found', 404);
  }

  try {
    ensureBookingAllowsSeatMove(requesterBooking.status);
    await ensureScreeningAllowsSeatMove(requesterBooking.screeningId);
  } catch (error) {
    if (error instanceof SeatMoveGuardError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }

  if (requesterBookingSeatId) {
    const ownsSeat = requesterBooking.bookingSeats.some((seat) => seat.id === requesterBookingSeatId);
    if (!ownsSeat) return jsonError('requesterBookingSeatId does not belong to this booking', 400);
  }

  const targetBookingSeat = await prisma.bookingSeat.findUnique({
    where: { id: targetBookingSeatId },
    include: { booking: true },
  });
  if (!targetBookingSeat || targetBookingSeat.booking.status === 'CANCELLED') {
    return jsonError('Target seat not found', 404);
  }

  try {
    ensureBookingAllowsSeatMove(targetBookingSeat.booking.status);
    await ensureScreeningAllowsSeatMove(targetBookingSeat.screeningId);
  } catch (error) {
    if (error instanceof SeatMoveGuardError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }

  if (targetBookingSeat.screeningId !== requesterBooking.screeningId) {
    return jsonError('Target seat must belong to the same screening', 400);
  }
  if (targetBookingSeat.booking.userId === sessionUser.id) {
    return jsonError('Cannot request your own seat', 400);
  }

  const duplicate = await prisma.seatMoveRequest.findFirst({
    where: {
      requesterBookingId,
      targetBookingSeatId,
      status: 'PENDING',
    },
  });
  if (duplicate) {
    return jsonError('A pending request for this seat already exists', 409);
  }

  const seatMoveRequest = await prisma.seatMoveRequest.create({
    data: {
      requesterBookingSeatId,
      targetBookingSeatId,
      requesterBookingId,
      targetBookingId: targetBookingSeat.bookingId,
      fee: FEE,
      cashbackAmount: CASHBACK,
      status: 'PENDING',
    },
  });

  return jsonOk({ seatMoveRequest }, { status: 201 });
}
