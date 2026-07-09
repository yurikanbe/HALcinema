import { prisma } from '@/lib/prisma';
import { asBigIntId } from '@/lib/api/bookingPayload';
import { jsonError, jsonOk } from '@/lib/api/response';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const screeningId = asBigIntId(id, 'id');

  await prisma.screeningSeatLock.deleteMany({
    where: {
      screeningId,
      status: 'HELD',
      expiresAt: { lt: new Date() },
    },
  });

  const screening = await prisma.screening.findUnique({
    where: { id: screeningId },
    include: {
      screen: {
        include: {
          seats: {
            orderBy: [{ rowLabel: 'asc' }, { seatNumber: 'asc' }],
          },
        },
      },
      screeningSeatLocks: true,
      bookingSeats: {
        where: { booking: { status: { not: 'CANCELLED' } } },
        select: { id: true, seatId: true, bookingId: true },
      },
    },
  });

  if (!screening) {
    return jsonError('Screening not found', 404);
  }

  const lockBySeatId = new Map(
    screening.screeningSeatLocks.map((lock) => [lock.seatId.toString(), lock]),
  );
  const bookingSeatBySeatId = new Map(
    screening.bookingSeats.map((bookingSeat) => [bookingSeat.seatId.toString(), bookingSeat]),
  );

  const seats = screening.screen.seats.map((seat) => {
    const lock = lockBySeatId.get(seat.id.toString());
    const bookingSeat = bookingSeatBySeatId.get(seat.id.toString());
    const status = lock?.status ?? (bookingSeat ? 'CONFIRMED' : 'AVAILABLE');
    return {
      ...seat,
      id: seat.id.toString(),
      status,
      holdExpiresAt: lock?.expiresAt ?? null,
      bookingSeatId: bookingSeat?.id.toString() ?? null,
      bookingId: bookingSeat?.bookingId.toString() ?? null,
    };
  });

  return jsonOk({
    screeningId,
    seats,
  });
}
