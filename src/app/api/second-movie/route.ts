import { prisma } from '@/lib/prisma';
import { asBigIntId, createBookingNumber } from '@/lib/api/bookingPayload';
import { jsonError, jsonOk } from '@/lib/api/response';
import { getSessionUser } from '@/lib/api/session';
import {
  getSecondMovieRecommendations,
  userWatchedFirstMovieToday,
} from '@/lib/api/secondMovieService';

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return jsonError('2本目レコメンドの利用にはログインが必要です', 401);
  }

  const { searchParams } = new URL(request.url);
  const bookingIdParam = searchParams.get('bookingId');
  if (!bookingIdParam) {
    return jsonError('bookingId is required', 400);
  }

  let bookingId: bigint;
  try {
    bookingId = asBigIntId(bookingIdParam, 'bookingId');
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Invalid bookingId', 400);
  }

  const simulateEnd = searchParams.get('simulateEnd') === '1';

  try {
    const result = await getSecondMovieRecommendations({
      userId: sessionUser.id,
      bookingId,
      simulateEnd,
    });
    return jsonOk(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Failed to load recommendations', 500);
  }
}

interface SecondMovieBookPayload {
  parentBookingId?: string | number;
  screeningId?: string | number;
  seatId?: string | number;
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return jsonError('2本目購入にはログインが必要です', 401);
  }

  let payload: SecondMovieBookPayload;
  try {
    payload = await request.json();
  } catch {
    return jsonError('Request body must be JSON', 400);
  }

  const simulateEnd = new URL(request.url).searchParams.get('simulateEnd') === '1';

  let parentBookingId: bigint;
  let screeningId: bigint;
  let seatId: bigint;
  try {
    parentBookingId = asBigIntId(payload.parentBookingId, 'parentBookingId');
    screeningId = asBigIntId(payload.screeningId, 'screeningId');
    seatId = asBigIntId(payload.seatId, 'seatId');
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Invalid payload', 400);
  }

  const now = new Date();

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const eligibility = await userWatchedFirstMovieToday({
        userId: sessionUser.id,
        bookingId: parentBookingId,
        now,
        simulateEnd,
      });
      if (!eligibility.ok || !eligibility.booking) {
        throw new Error(eligibility.reason ?? '2本目購入の条件を満たしていません');
      }

      const parent = eligibility.booking;
      if (!parent.afterSurveyCompletedAt) {
        throw new Error('アンケートに回答すると2本目割引が適用されます');
      }

      const screening = await tx.screening.findUnique({
        where: { id: screeningId },
        include: {
          movie: true,
          screen: true,
          screeningSeatLocks: true,
        },
      });
      if (!screening || screening.status !== 'SCHEDULED') {
        throw new Error('上映回が見つかりません');
      }
      if (screening.screenId === parent.screening.screenId) {
        throw new Error('2本目は別スクリーンの上映のみ購入できます');
      }
      if (screening.startTime <= now) {
        throw new Error('この上映回はすでに開始しています');
      }

      const seat = await tx.seat.findFirst({
        where: { id: seatId, screenId: screening.screenId },
      });
      if (!seat) throw new Error('座席が見つかりません');

      const activeLock = await tx.screeningSeatLock.findFirst({
        where: {
          screeningId,
          seatId,
          OR: [
            { status: 'CONFIRMED' },
            { status: 'HELD', expiresAt: { gt: now } },
            { status: 'HELD', expiresAt: null },
          ],
        },
      });
      if (activeLock) throw new Error('選択した席はすでに確保されています');

      const ticketType = await tx.ticketType.findFirst({
        where: { isActive: true },
        orderBy: { id: 'asc' },
      });
      if (!ticketType) throw new Error('券種が見つかりません');

      const unitPrice = screening.movie.secondMoviePrice + (seat.isPremium ? 500 : 0);

      const created = await tx.booking.create({
        data: {
          userId: sessionUser.id,
          screeningId,
          bookingNumber: createBookingNumber(),
          bookingType: 'MEMBER',
          totalAmount: unitPrice,
          paymentMethod: 'CREDIT_CARD',
          paymentStatus: 'COMPLETED',
          status: 'CONFIRMED',
          isSecondMovie: true,
          parentBookingId: parent.id,
          bookingSeats: {
            create: {
              screeningId,
              seatId,
              ticketTypeId: ticketType.id,
              unitPrice,
            },
          },
          screeningSeatLocks: {
            create: {
              screeningId,
              seatId,
              userId: sessionUser.id,
              status: 'CONFIRMED',
            },
          },
          payments: {
            create: {
              provider: 'mock',
              providerTransactionId: `second_movie_${crypto.randomUUID()}`,
              method: 'CREDIT_CARD',
              amount: unitPrice,
              status: 'COMPLETED',
              paidAt: now,
            },
          },
        },
        include: {
          screening: { include: { movie: true, screen: { include: { theater: true } } } },
          bookingSeats: { include: { seat: true } },
        },
      });

      return created;
    });

    return jsonOk({ booking }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : '2本目の購入に失敗しました', 400);
  }
}
