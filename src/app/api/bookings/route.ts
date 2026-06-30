import { Prisma, type BookingStatus, type PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assertCreateBookingPayload, asBigIntId, createBookingNumber, optionalBigIntId } from '@/lib/api/bookingPayload';
import { jsonError, jsonOk } from '@/lib/api/response';

const HOLD_MINUTES = 15;

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = optionalBigIntId(searchParams.get('userId'), 'userId');
  const guestEmail = searchParams.get('guestEmail')?.trim();

  if (!userId && !guestEmail) {
    return jsonError('userId or guestEmail is required until authentication is wired', 400);
  }

  const bookings = await prisma.booking.findMany({
    where: userId ? { userId } : { guestEmail },
    orderBy: { createdAt: 'desc' },
    include: {
      screening: {
        include: {
          movie: true,
          screen: {
            include: { theater: true },
          },
        },
      },
      bookingSeats: {
        include: {
          seat: true,
          ticketType: true,
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  return jsonOk({ bookings });
}

export async function POST(request: Request) {
  let payload;

  try {
    payload = assertCreateBookingPayload(await request.json());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Invalid request body', 400);
  }

  const now = new Date();
  const screeningId = asBigIntId(payload.screeningId, 'screeningId');
  const userId = optionalBigIntId(payload.userId, 'userId');
  const requestedSeats = payload.seats!.map((seat) => ({
    seatId: asBigIntId(seat.seatId, 'seatId'),
    ticketTypeId: asBigIntId(seat.ticketTypeId, 'ticketTypeId'),
  }));
  const seatIds = [...new Set(requestedSeats.map((seat) => seat.seatId.toString()))].map(BigInt);

  if (seatIds.length !== requestedSeats.length) {
    return jsonError('Duplicate seats are not allowed in one booking', 400);
  }

  try {
    const booking = await prisma.$transaction(async (tx) => {
      await tx.screeningSeatLock.deleteMany({
        where: {
          status: 'HELD',
          expiresAt: { lt: now },
        },
      });

      const screening = await tx.screening.findUnique({
        where: { id: screeningId },
        include: { screen: true },
      });
      if (!screening || screening.status !== 'SCHEDULED') {
        throw new Error('Screening is not available for booking');
      }
      if (screening.startTime <= now) {
        throw new Error('Screening has already started');
      }

      const seats = await tx.seat.findMany({
        where: {
          id: { in: seatIds },
          screenId: screening.screenId,
        },
      });
      if (seats.length !== seatIds.length) {
        throw new Error('One or more seats do not belong to this screening');
      }

      const ticketTypes = await tx.ticketType.findMany({
        where: {
          id: { in: requestedSeats.map((seat) => seat.ticketTypeId) },
          isActive: true,
        },
      });
      const ticketTypeById = new Map(ticketTypes.map((ticket) => [ticket.id.toString(), ticket]));
      if (ticketTypeById.size !== new Set(requestedSeats.map((seat) => seat.ticketTypeId.toString())).size) {
        throw new Error('One or more ticket types are not available');
      }

      const activeLocks = await tx.screeningSeatLock.findMany({
        where: {
          screeningId,
          seatId: { in: seatIds },
          OR: [
            { status: 'CONFIRMED' },
            { status: 'HELD', expiresAt: { gt: now } },
            { status: 'HELD', expiresAt: null },
          ],
        },
      });
      if (activeLocks.length > 0) {
        throw new Error('One or more seats are already held or booked');
      }

      const seatById = new Map(seats.map((seat) => [seat.id.toString(), seat]));
      const bookingSeats = requestedSeats.map((seat) => {
        const ticketType = ticketTypeById.get(seat.ticketTypeId.toString())!;
        const seatRecord = seatById.get(seat.seatId.toString())!;
        const premiumSurcharge = seatRecord.isPremium ? 500 : 0;
        return {
          screeningId,
          seatId: seat.seatId,
          ticketTypeId: seat.ticketTypeId,
          unitPrice: ticketType.basePrice + premiumSurcharge,
        };
      });
      const totalAmount = bookingSeats.reduce((sum, seat) => sum + seat.unitPrice, 0);
      const bookingType = userId ? 'MEMBER' : 'GUEST';

      const created = await tx.booking.create({
        data: {
          userId,
          screeningId,
          bookingNumber: createBookingNumber(),
          bookingType,
          guestName: userId ? null : payload.guestName?.trim(),
          guestEmail: userId ? null : payload.guestEmail?.trim(),
          guestPhone: userId ? null : payload.guestPhone?.trim() || null,
          totalAmount,
          paymentMethod: payload.paymentMethod ?? null,
          paymentStatus: 'UNPAID' as PaymentStatus,
          status: 'PENDING' as BookingStatus,
          expiresAt: addMinutes(now, HOLD_MINUTES),
          bookingSeats: {
            createMany: { data: bookingSeats },
          },
          screeningSeatLocks: {
            createMany: {
              data: seatIds.map((seatId) => ({
                screeningId,
                seatId,
                userId,
                status: 'HELD',
                expiresAt: addMinutes(now, HOLD_MINUTES),
              })),
            },
          },
        },
        include: {
          bookingSeats: { include: { seat: true, ticketType: true } },
          screeningSeatLocks: true,
          screening: { include: { movie: true, screen: { include: { theater: true } } } },
        },
      });

      return created;
    });

    return jsonOk({ booking }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return jsonError('One or more seats are already held or booked', 409);
    }
    return jsonError(error instanceof Error ? error.message : 'Failed to create booking', 400);
  }
}
