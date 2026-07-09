import { Prisma, type BookingStatus, type PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assertCreateBookingPayload, asBigIntId, createBookingNumber } from '@/lib/api/bookingPayload';
import { jsonError, jsonOk } from '@/lib/api/response';
import { getSessionUser } from '@/lib/api/session';
import { linkPendingMovesToBooking, recalculateBookingTotalAmount } from '@/lib/api/seatMoveService';

const HOLD_MINUTES = 15;

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return jsonError('Sign in to view your bookings. Guests can look up a booking via /api/guest-bookings/lookup', 401);
  }

  const bookings = await prisma.booking.findMany({
    where: { userId: sessionUser.id },
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
  const sessionUser = await getSessionUser();
  const userId = sessionUser?.id ?? null;

  if (!userId) {
    if (!payload.guestName?.trim()) return jsonError('guestName is required for guest booking', 400);
    if (!payload.guestEmail?.trim()) return jsonError('guestEmail is required for guest booking', 400);
  }

  const seatMoveRequestIds = (payload.seatMoveRequestIds ?? []).map((id) =>
    asBigIntId(id, 'seatMoveRequestId'),
  );
  const buyoutTickets = (payload.buyoutTickets ?? []).map((item) => ({
    requestId: asBigIntId(item.requestId, 'requestId'),
    ticketTypeId: asBigIntId(item.ticketTypeId, 'ticketTypeId'),
  }));

  if (seatMoveRequestIds.length > 0 && !userId) {
    return jsonError('譲渡リクエストの決済にはログインが必要です', 401);
  }

  const requestedSeats = (payload.seats ?? []).map((seat) => ({
    seatId: asBigIntId(seat.seatId, 'seatId'),
    ticketTypeId: asBigIntId(seat.ticketTypeId, 'ticketTypeId'),
  }));
  const seatIds = [...new Set(requestedSeats.map((seat) => seat.seatId.toString()))].map(BigInt);

  if (seatIds.length !== requestedSeats.length) {
    return jsonError('Duplicate seats are not allowed in one booking', 400);
  }

  await prisma.screeningSeatLock.deleteMany({
    where: {
      status: 'HELD',
      expiresAt: { lt: now },
    },
  });

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const screening = await tx.screening.findUnique({
        where: { id: screeningId },
        include: { screen: true },
      });
      if (!screening || screening.status !== 'SCHEDULED') {
        throw new Error('Screening is not available for booking');
      }
      if (screening.startTime <= now) {
        throw new Error('この上映回はすでに開始しているため、予約できません。');
      }

      let existingPending = userId
        ? await tx.booking.findFirst({
            where: {
              userId,
              screeningId,
              status: 'PENDING',
              paymentStatus: 'UNPAID',
            },
            include: { bookingSeats: true },
          })
        : null;

      if (seatMoveRequestIds.length > 0) {
        const moves = await tx.seatMoveRequest.findMany({
          where: {
            id: { in: seatMoveRequestIds },
            requesterUserId: userId!,
            screeningId,
            status: { in: ['PENDING', 'APPROVED'] },
          },
        });
        if (moves.length !== seatMoveRequestIds.length) {
          throw new Error('譲渡リクエストが見つからないか、すでに無効です');
        }
      }

      if (seatIds.length > 0) {
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

        const existingSeatIds = new Set(
          (existingPending?.bookingSeats ?? []).map((seat) => seat.seatId.toString()),
        );
        const newSeatIds = seatIds.filter((id) => !existingSeatIds.has(id.toString()));

        if (newSeatIds.length > 0) {
          const activeLocks = await tx.screeningSeatLock.findMany({
            where: {
              screeningId,
              seatId: { in: newSeatIds },
              OR: [
                { status: 'CONFIRMED' },
                { status: 'HELD', expiresAt: { gt: now } },
                { status: 'HELD', expiresAt: null },
              ],
            },
          });
          const conflicts = activeLocks.filter(
            (lock) => !(lock.userId === userId && lock.bookingId === existingPending?.id),
          );
          if (conflicts.length > 0) {
            throw new Error('One or more seats are already held or booked');
          }
        }

        const seatById = new Map(seats.map((seat) => [seat.id.toString(), seat]));
        const newBookingSeats = requestedSeats
          .filter((seat) => !existingSeatIds.has(seat.seatId.toString()))
          .map((seat) => {
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

        const expiresAt = addMinutes(now, HOLD_MINUTES);

        if (existingPending) {
          if (newBookingSeats.length > 0) {
            await tx.bookingSeat.createMany({
              data: newBookingSeats.map((seat) => ({
                ...seat,
                bookingId: existingPending!.id,
              })),
            });
            await tx.screeningSeatLock.createMany({
              data: newBookingSeats.map((seat) => ({
                screeningId,
                seatId: seat.seatId,
                userId,
                bookingId: existingPending!.id,
                status: 'HELD',
                expiresAt,
              })),
            });
          }
          await tx.booking.update({
            where: { id: existingPending.id },
            data: { expiresAt },
          });
        } else {
          existingPending = await tx.booking.create({
            data: {
              userId,
              screeningId,
              bookingNumber: createBookingNumber(),
              bookingType: 'MEMBER',
              totalAmount: 0,
              paymentStatus: 'UNPAID' as PaymentStatus,
              status: 'PENDING' as BookingStatus,
              expiresAt,
              bookingSeats: {
                createMany: { data: newBookingSeats },
              },
              screeningSeatLocks: {
                createMany: {
                  data: newBookingSeats.map((seat) => ({
                    screeningId,
                    seatId: seat.seatId,
                    userId,
                    status: 'HELD',
                    expiresAt,
                  })),
                },
              },
            },
            include: { bookingSeats: true },
          });
        }
      } else if (!existingPending && seatMoveRequestIds.length > 0) {
        const approvedMove = await tx.seatMoveRequest.findFirst({
          where: {
            id: { in: seatMoveRequestIds },
            status: 'APPROVED',
            requesterBookingId: { not: null },
          },
        });
        if (approvedMove?.requesterBookingId) {
          existingPending = await tx.booking.findFirst({
            where: { id: approvedMove.requesterBookingId },
            include: { bookingSeats: true },
          });
        }
      }

      if (!existingPending && seatIds.length === 0) {
        throw new Error('譲渡の承認をお待ちください。空席を選択するか、承認後に再度お試しください。');
      }

      if (!existingPending) {
        const bookingType = userId ? 'MEMBER' : 'GUEST';
        existingPending = await tx.booking.create({
          data: {
            userId,
            screeningId,
            bookingNumber: createBookingNumber(),
            bookingType,
            guestName: userId ? null : payload.guestName?.trim(),
            guestEmail: userId ? null : payload.guestEmail?.trim(),
            guestPhone: userId ? null : payload.guestPhone?.trim() || null,
            totalAmount: 0,
            paymentMethod: payload.paymentMethod ?? null,
            paymentStatus: 'UNPAID' as PaymentStatus,
            status: 'PENDING' as BookingStatus,
            expiresAt: addMinutes(now, HOLD_MINUTES),
          },
          include: { bookingSeats: true },
        });
      }

      const bookingId = existingPending.id;

      if (userId) {
        await linkPendingMovesToBooking(tx, { userId, screeningId, bookingId });
      }

      if (seatMoveRequestIds.length > 0) {
        await tx.seatMoveRequest.updateMany({
          where: {
            id: { in: seatMoveRequestIds },
            requesterUserId: userId!,
            screeningId,
            status: { in: ['PENDING', 'APPROVED'] },
          },
          data: { requesterBookingId: bookingId },
        });
      }

      if (buyoutTickets.length > 0) {
        const ticketTypeIds = [...new Set(buyoutTickets.map((item) => item.ticketTypeId.toString()))].map(
          BigInt,
        );
        const ticketTypes = await tx.ticketType.findMany({
          where: { id: { in: ticketTypeIds }, isActive: true },
        });
        const ticketTypeById = new Map(ticketTypes.map((ticket) => [ticket.id.toString(), ticket]));
        if (ticketTypeById.size !== ticketTypeIds.length) {
          throw new Error('One or more ticket types are not available');
        }

        for (const item of buyoutTickets) {
          const move = await tx.seatMoveRequest.findFirst({
            where: {
              id: item.requestId,
              requesterUserId: userId!,
              screeningId,
              requesterBookingId: bookingId,
              status: 'PENDING',
            },
            include: {
              targetBookingSeat: { include: { seat: true } },
            },
          });
          if (!move) {
            throw new Error('承認待ちの譲渡リクエストが見つかりません');
          }

          const ticketType = ticketTypeById.get(item.ticketTypeId.toString())!;
          const premiumSurcharge = move.targetBookingSeat.seat.isPremium ? 500 : 0;
          await tx.seatMoveRequest.update({
            where: { id: move.id },
            data: {
              prepaidTicketTypeId: item.ticketTypeId,
              prepaidUnitPrice: ticketType.basePrice + premiumSurcharge,
            },
          });
        }
      }

      const pendingMoveCount = await tx.seatMoveRequest.count({
        where: {
          requesterBookingId: bookingId,
          status: 'PENDING',
        },
      });
      if (pendingMoveCount > 0 && buyoutTickets.length < pendingMoveCount) {
        throw new Error('承認待ちの譲渡席の券種を選択してください');
      }

      const seatCount = await tx.bookingSeat.count({ where: { bookingId } });
      const linkedMoveCount = await tx.seatMoveRequest.count({
        where: {
          requesterBookingId: bookingId,
          status: { in: ['PENDING', 'APPROVED'] },
        },
      });
      if (seatCount === 0 && linkedMoveCount === 0) {
        throw new Error('決済できる内容がありません。座席を選択するか、譲渡リクエストを送信してください。');
      }

      await recalculateBookingTotalAmount(tx, bookingId);

      return tx.booking.update({
        where: { id: bookingId },
        data: { expiresAt: addMinutes(now, HOLD_MINUTES) },
        include: {
          bookingSeats: { include: { seat: true, ticketType: true } },
          screeningSeatLocks: true,
          screening: { include: { movie: true, screen: { include: { theater: true } } } },
        },
      });
    }, { timeout: 15000 });

    return jsonOk({ booking }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return jsonError('One or more seats are already held or booked', 409);
    }
    return jsonError(error instanceof Error ? error.message : 'Failed to create booking', 400);
  }
}
