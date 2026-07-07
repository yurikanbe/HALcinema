import { ScreeningFormat } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { jsonOk } from '@/lib/api/response';
import { ensureUpcomingScreenings } from '@/lib/screeningAutoFill';

const THEATER_ID_BY_NAME: Record<string, 'starry' | 'abyss' | 'cyber'> = {
  'Starry Theater': 'starry',
  'Abyss Theater': 'abyss',
  'Cyber Theater': 'cyber',
};

const FORMAT_LABEL: Record<ScreeningFormat, string> = {
  SUBTITLED: '字幕',
  DUBBED: '吹替',
  ORIGINAL: 'オリジナル',
};

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  }).format(date);
}

function formatIsoDate(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(date);
}

function formatDateLabel(date: Date): string {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Tokyo',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  const weekday = parts.find((part) => part.type === 'weekday')?.value;
  return `${year}年${month}月${day}日（${weekday}）`;
}

function jstDateRange(isoDate: string): { gte: Date; lt: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const start = new Date(`${isoDate}T00:00:00+09:00`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { gte: start, lt: end };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const movieId = searchParams.get('movieId');
  const date = searchParams.get('date');
  const dateRange = date ? jstDateRange(date) : null;

  await ensureUpcomingScreenings();

  await prisma.screeningSeatLock.deleteMany({
    where: {
      status: 'HELD',
      expiresAt: { lt: new Date() },
    },
  });

  const ticketTypes = await prisma.ticketType.findMany({
    where: { isActive: true },
    orderBy: { id: 'asc' },
  });

  const screenings = await prisma.screening.findMany({
    where: {
      status: 'SCHEDULED',
      movie: movieId ? { slug: movieId } : undefined,
      startTime: dateRange ?? undefined,
    },
    orderBy: { startTime: 'asc' },
    include: {
      movie: true,
      screen: {
        include: {
          theater: true,
          seats: {
            orderBy: [{ rowLabel: 'asc' }, { seatNumber: 'asc' }],
          },
        },
      },
      screeningSeatLocks: true,
    },
  });

  const options = screenings
    .map((screening) => {
      const theaterName = screening.screen.theater?.name ?? '';
      const theaterId = THEATER_ID_BY_NAME[theaterName];
      if (!theaterId) return null;

      const lockBySeatId = new Map(
        screening.screeningSeatLocks.map((lock) => [lock.seatId.toString(), lock]),
      );
      const seats = screening.screen.seats.map((seat) => {
        const lock = lockBySeatId.get(seat.id.toString());
        return {
          id: `${seat.rowLabel}${seat.seatNumber}`,
          dbId: seat.id.toString(),
          row: seat.rowLabel,
          number: seat.seatNumber,
          isPremium: seat.isPremium,
          isAccessible: seat.isAccessible,
          status: lock?.status ?? 'AVAILABLE',
        };
      });
      const remainingSeats = seats.filter((seat) => seat.status === 'AVAILABLE').length;
      const time = formatTime(screening.startTime);
      const date = formatIsoDate(screening.startTime);

      return {
        screeningId: screening.id.toString(),
        screeningKey: `${screening.id}`,
        movieId: screening.movie.slug,
        movieTitle: screening.movie.titleJa,
        poster: screening.movie.posterImageUrl ?? undefined,
        duration: screening.movie.durationMinutes,
        theaterId,
        theaterName,
        screen: `Screen ${screening.screen.screenNumber}`,
        screenNumber: screening.screen.screenNumber,
        conceptName: screening.screen.conceptName,
        time,
        format: FORMAT_LABEL[screening.format],
        date,
        dateLabel: formatDateLabel(screening.startTime),
        remainingSeats,
        seats,
        ticketTypes: ticketTypes.map((ticket) => ({
          id: ticket.id.toString(),
          dbId: ticket.id.toString(),
          nameJa: ticket.nameJa,
          basePrice: ticket.basePrice,
        })),
        isApiBacked: true,
      };
    })
    .filter(Boolean);

  return jsonOk({ screenings: options, ticketTypes });
}
