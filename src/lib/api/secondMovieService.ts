import { prisma } from '@/lib/prisma';
import { fallbackWalkMinutes } from '@/lib/secondMovieConfig';
import { ensureAfterMovieNotifications } from '@/lib/api/afterMovieNotify';
import {
  buildSecondMovieRecommendations,
  type RecommendableScreening,
} from '@/lib/secondMovieRecommend';

function startOfTodayJst(now: Date): Date {
  const iso = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(now);
  return new Date(`${iso}T00:00:00+09:00`);
}

function endOfTodayJst(now: Date): Date {
  const start = startOfTodayJst(now);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export async function userWatchedFirstMovieToday(params: {
  userId: string;
  bookingId: bigint;
  now: Date;
  simulateEnd?: boolean;
}): Promise<{ ok: boolean; reason?: string; booking?: Awaited<ReturnType<typeof loadParentBooking>> }> {
  const booking = await loadParentBooking(params.bookingId, params.userId);
  if (!booking) return { ok: false, reason: '予約が見つかりません' };
  if (booking.isSecondMovie) return { ok: false, reason: '2本目予約からはさらに2本目を購入できません' };
  if (booking.status !== 'CONFIRMED' || booking.paymentStatus !== 'COMPLETED') {
    return { ok: false, reason: '確定済みの1本目予約が必要です' };
  }

  const todayStart = startOfTodayJst(params.now);
  const todayEnd = endOfTodayJst(params.now);
  if (
    booking.screening.endTime < todayStart ||
    booking.screening.startTime >= todayEnd
  ) {
    return { ok: false, reason: '当日の鑑賞に限り2本目価格が適用されます' };
  }

  const ended =
    params.simulateEnd ||
    booking.screening.endTime <= params.now ||
    booking.checkedInAt != null;

  if (!ended) {
    return { ok: false, reason: '1本目の上映終了後にご利用いただけます' };
  }

  const existingSecond = await prisma.booking.findFirst({
    where: {
      userId: params.userId,
      parentBookingId: booking.id,
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
  });
  if (existingSecond) {
    return { ok: false, reason: 'この1本目予約に紐づく2本目はすでに購入済みです' };
  }

  return { ok: true, booking };
}

async function loadParentBooking(bookingId: bigint, userId: string) {
  return prisma.booking.findFirst({
    where: { id: bookingId, userId },
    include: {
      screening: {
        include: {
          movie: true,
          screen: { include: { theater: true } },
        },
      },
    },
  });
}

export async function getSecondMovieRecommendations(params: {
  userId: string;
  bookingId: bigint;
  now?: Date;
  simulateEnd?: boolean;
}) {
  const now = params.now ?? new Date();

  await ensureAfterMovieNotifications({
    userId: params.userId,
    now,
    simulateBookingId: params.simulateEnd ? params.bookingId : undefined,
  });

  const eligibility = await userWatchedFirstMovieToday({
    userId: params.userId,
    bookingId: params.bookingId,
    now,
    simulateEnd: params.simulateEnd,
  });
  if (!eligibility.ok || !eligibility.booking) {
    return { eligible: false as const, reason: eligibility.reason ?? '利用できません' };
  }

  const parent = eligibility.booking;
  const surveyCompleted = !!parent.afterSurveyCompletedAt;
  const fromScreenId = parent.screening.screenId;

  const walkRows = await prisma.screenTransferTime.findMany({
    where: { fromScreenId },
  });
  const walkMinutesByTargetScreen = new Map(
    walkRows.map((row) => [row.toScreenId.toString(), row.walkMinutes]),
  );

  const screenings = await prisma.screening.findMany({
    where: {
      status: 'SCHEDULED',
      startTime: { gt: now },
      screenId: { not: fromScreenId },
    },
    include: {
      movie: true,
      screeningSeatLocks: true,
      screen: {
        include: {
          theater: true,
          seats: { select: { id: true } },
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  const candidates: RecommendableScreening[] = screenings.map((screening) => {
    const lockedSeatIds = new Set(
      screening.screeningSeatLocks
        .filter((lock) => lock.status === 'CONFIRMED' || lock.status === 'HELD')
        .map((lock) => lock.seatId.toString()),
    );
    const availableSeats = screening.screen.seats.filter(
      (seat) => !lockedSeatIds.has(seat.id.toString()),
    ).length;

    return {
      id: screening.id,
      startTime: screening.startTime,
      endTime: screening.endTime,
      format: screening.format,
      movie: {
        id: screening.movie.id,
        slug: screening.movie.slug,
        titleJa: screening.movie.titleJa,
        genre: screening.movie.genre,
        durationMinutes: screening.movie.durationMinutes,
        posterImageUrl: screening.movie.posterImageUrl,
        normalPrice: screening.movie.normalPrice,
        secondMoviePrice: screening.movie.secondMoviePrice,
      },
      screen: {
        id: screening.screen.id,
        screenNumber: screening.screen.screenNumber,
        conceptName: screening.screen.conceptName,
        theater: screening.screen.theater,
      },
      availableSeats,
    };
  });

  const recommendations = surveyCompleted
    ? buildSecondMovieRecommendations({
        now,
        firstScreenId: fromScreenId,
        firstConceptName: parent.screening.screen.conceptName,
        firstGenre: parent.screening.movie.genre,
        firstEndTime: parent.screening.endTime,
        candidates,
        walkMinutesByTargetScreen,
      })
    : [];

  return {
    eligible: true as const,
    surveyCompleted,
    discountUnlocked: surveyCompleted,
    parentBooking: {
      id: parent.id.toString(),
      movieTitle: parent.screening.movie.titleJa,
      endTime: parent.screening.endTime.toISOString(),
      screenConcept: parent.screening.screen.conceptName,
      screenNumber: parent.screening.screen.screenNumber,
    },
    safetyBufferMinutes: Number(process.env.SECOND_MOVIE_SAFETY_BUFFER_MINUTES ?? 2),
    recommendations,
  };
}

export async function resolveWalkMinutes(fromScreenId: bigint, toScreenId: bigint): Promise<number> {
  const row = await prisma.screenTransferTime.findUnique({
    where: {
      fromScreenId_toScreenId: { fromScreenId, toScreenId },
    },
  });
  if (row) return row.walkMinutes;

  const [from, to] = await Promise.all([
    prisma.screen.findUnique({ where: { id: fromScreenId } }),
    prisma.screen.findUnique({ where: { id: toScreenId } }),
  ]);
  if (!from || !to) return 3;
  return fallbackWalkMinutes(from.conceptName, to.conceptName);
}
