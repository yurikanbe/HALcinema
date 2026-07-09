import { prisma } from '@/lib/prisma';
import { jsonError, jsonOk } from '@/lib/api/response';
import { getSessionUser } from '@/lib/api/session';
import { DEV_DEMO_ACCOUNTS, DEV_DEMO_PASSWORD, isDevToolsEnabled } from '@/lib/devTools';
import { ensureDemoUsers } from '@/lib/devDemoUsers';

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

const THEATER_ID_BY_NAME: Record<string, string> = {
  'Starry Theater': 'starry',
  'Abyss Theater': 'abyss',
  'Cyber Theater': 'cyber',
};

const FORMAT_LABEL: Record<string, string> = {
  SUBTITLED: '字幕',
  DUBBED: '吹替',
  ORIGINAL: 'オリジナル',
};

export async function GET() {
  if (!isDevToolsEnabled()) {
    return jsonError('Not found', 404);
  }

  await ensureDemoUsers();

  const sessionUser = await getSessionUser();
  const now = new Date();

  const demoUsers = await prisma.user.findMany({
    where: { email: { in: DEV_DEMO_ACCOUNTS.map((account) => account.email) } },
    orderBy: { email: 'asc' },
    include: {
      bookings: {
        where: {
          status: { in: ['PENDING', 'CONFIRMED'] },
          screening: { startTime: { gt: now } },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: {
          screening: {
            include: {
              movie: true,
              screen: { include: { theater: true } },
            },
          },
          bookingSeats: { include: { seat: true } },
          requestedSeatMoves: { where: { status: 'PENDING' } },
          targetedSeatMoves: { where: { status: 'PENDING' } },
        },
      },
    },
  });

  const screenings = await prisma.screening.findMany({
    where: { status: 'SCHEDULED', startTime: { gt: now } },
    orderBy: { startTime: 'asc' },
    take: 8,
    include: {
      movie: true,
      screen: { include: { theater: true } },
    },
  });

  return jsonOk({
    password: DEV_DEMO_PASSWORD,
    currentUser: sessionUser,
    demoUsers: demoUsers.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hint: DEV_DEMO_ACCOUNTS.find((account) => account.email === user.email)?.hint ?? '',
      bookings: user.bookings.map((booking) => ({
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        movieTitle: booking.screening.movie.titleJa,
        startTime: booking.screening.startTime.toISOString(),
        seats: booking.bookingSeats.map(
          (seat) => `${seat.seat.rowLabel}${seat.seat.seatNumber}`,
        ),
        pendingOutgoing: booking.requestedSeatMoves.length,
        pendingIncoming: booking.targetedSeatMoves.length,
      })),
    })),
    screenings: screenings.map((screening) => {
      const theaterName = screening.screen.theater?.name ?? '';
      const theaterId = THEATER_ID_BY_NAME[theaterName] ?? 'starry';
      const date = formatIsoDate(screening.startTime);
      const time = formatTime(screening.startTime);
      const format = FORMAT_LABEL[screening.format] ?? screening.format;

      return {
        id: screening.id.toString(),
        movieId: screening.movie.slug,
        movieTitle: screening.movie.titleJa,
        theaterId,
        screen: `Screen ${screening.screen.screenNumber}`,
        time,
        date,
        format,
        startTime: screening.startTime.toISOString(),
        reserveUrl: `/reserve?movieId=${encodeURIComponent(screening.movie.slug)}&theater=${theaterId}&screen=${encodeURIComponent(`Screen ${screening.screen.screenNumber}`)}&time=${encodeURIComponent(time)}&date=${date}&format=${encodeURIComponent(format)}`,
      };
    }),
  });
}

export async function POST() {
  if (!isDevToolsEnabled()) {
    return jsonError('Not found', 404);
  }

  await ensureDemoUsers();
  return jsonOk({ ok: true });
}
