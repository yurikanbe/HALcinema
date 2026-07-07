import { ScreeningFormat } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import schedules from '@/data/schedules.json';

const RESERVABLE_DAY_COUNT = 4;

const THEATER_CONCEPT_NAMES: Record<string, string> = {
  starry: 'Starry',
  abyss: 'Abyss',
  cyber: 'Cyber',
};

function toIsoDateJst(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(date);
}

function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00+09:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDateJst(date);
}

function toScreeningFormat(format: string): ScreeningFormat {
  if (format.includes('吹替')) return 'DUBBED';
  if (format.includes('字幕')) return 'SUBTITLED';
  return 'ORIGINAL';
}

function toDateTime(isoDate: string, time: string): Date {
  return new Date(`${isoDate}T${time}:00+09:00`);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function parseScreenNumber(screen: string): number {
  const match = screen.match(/(\d+)/);
  return match ? Number(match[1]) : 1;
}

/**
 * 上映回は「今日から RESERVABLE_DAY_COUNT 日分」だけ選択可能な設計のため、
 * リクエスト時点でその範囲にレコードが無い日付があれば schedules.json から補充する。
 */
export async function ensureUpcomingScreenings(): Promise<void> {
  const today = toIsoDateJst(new Date());
  const targetDates = Array.from({ length: RESERVABLE_DAY_COUNT }, (_, i) => addDaysIso(today, i));

  const existingDates = await prisma.screening.findMany({
    where: {
      status: 'SCHEDULED',
      startTime: {
        gte: new Date(`${targetDates[0]}T00:00:00+09:00`),
        lt: new Date(`${addDaysIso(targetDates[targetDates.length - 1], 1)}T00:00:00+09:00`),
      },
    },
    select: { startTime: true },
  });
  const existingDateSet = new Set(existingDates.map((s) => toIsoDateJst(s.startTime)));

  const missingDates = targetDates.filter((date) => !existingDateSet.has(date));
  if (missingDates.length === 0) return;

  const [movies, screens] = await Promise.all([
    prisma.movie.findMany({ select: { id: true, slug: true } }),
    prisma.screen.findMany({ select: { id: true, conceptName: true, theater: { select: { name: true } } } }),
  ]);
  const movieIdBySlug = new Map(movies.map((m) => [m.slug, m.id]));
  const screenIdByKey = new Map(screens.map((s) => [s.conceptName, s.id]));

  const screenings: {
    movieId: bigint;
    screenId: bigint;
    startTime: Date;
    endTime: Date;
    format: ScreeningFormat;
    status: 'SCHEDULED';
  }[] = [];

  for (const date of missingDates) {
    for (const schedule of schedules) {
      const conceptName = `${THEATER_CONCEPT_NAMES[schedule.theaterId]} ${parseScreenNumber(schedule.screen)}`;
      const screenId = screenIdByKey.get(conceptName);
      if (!screenId) continue;

      for (const show of schedule.shows) {
        const movieId = movieIdBySlug.get(show.movieId);
        if (!movieId) continue;

        const startTime = toDateTime(date, show.start);
        const endTime = addMinutes(startTime, show.duration);

        screenings.push({
          movieId,
          screenId,
          startTime,
          endTime,
          format: toScreeningFormat(show.format),
          status: 'SCHEDULED',
        });
      }
    }
  }

  if (screenings.length === 0) return;

  await prisma.screening.createMany({ data: screenings });
}
