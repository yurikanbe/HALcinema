import scheduleData from '@/data/schedules.json';
import moviesData from '@/data/movies.json';
import type { Movie, ScreenSchedule } from '@/types';
import type { TheaterId } from '@/lib/theaterConfig';
import { THEATER_CONFIG } from '@/lib/theaterConfig';

const schedules = scheduleData as ScreenSchedule[];
const movies = moviesData as Movie[];

/** database-data-items: ticket_types */
export interface TicketType {
  id: string;
  dbId?: string;
  nameJa: string;
  basePrice: number;
}

export const TICKET_TYPES: TicketType[] = [
  { id: 'general', nameJa: '一般', basePrice: 1800 },
  { id: 'university', nameJa: '大学生等', basePrice: 1600 },
  { id: 'student', nameJa: '中学・高校生', basePrice: 1400 },
  { id: 'child', nameJa: '小学生・幼児', basePrice: 1000 },
];

export const PREMIUM_SURCHARGE = 500;
export const MAX_SEATS_PER_BOOKING = 6;

export interface SeatCell {
  id: string;
  dbId?: string;
  row: string;
  number: number;
  isPremium: boolean;
  isAccessible: boolean;
  status?: 'AVAILABLE' | 'HELD' | 'CONFIRMED';
}

export interface SeatLayout {
  theaterId: TheaterId;
  rows: string[];
  seatsPerRow: number;
  aisleAfter?: number[];
}

/** スクリーンごとの座席レイアウト（プロトタイプ用） */
export const SEAT_LAYOUTS: Record<TheaterId, SeatLayout> = {
  starry: { theaterId: 'starry', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], seatsPerRow: 10, aisleAfter: [5] },
  abyss: { theaterId: 'abyss', rows: ['A', 'B', 'C', 'D', 'E', 'F'], seatsPerRow: 10, aisleAfter: [5] },
  cyber: { theaterId: 'cyber', rows: ['A', 'B', 'C', 'D', 'E'], seatsPerRow: 8, aisleAfter: [4] },
};

export interface ScreeningSelection {
  screeningId?: string;
  movieId: string;
  movieTitle: string;
  poster?: string;
  duration: number;
  theaterId: TheaterId;
  theaterName: string;
  screen: string;
  screenNumber: number;
  conceptName: string;
  time: string;
  format: string;
  date: string;
  dateLabel: string;
  remainingSeats?: number;
  seats?: SeatCell[];
  ticketTypes?: TicketType[];
  isApiBacked?: boolean;
}

export interface ReserveShowOption extends ScreeningSelection {
  screeningKey: string;
}

function parseScreenNumber(screen: string): number {
  const match = screen.match(/(\d+)/);
  return match ? Number(match[1]) : 1;
}

function formatDateLabel(date: Date): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${days[date.getDay()]}）`;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildScreeningKey(selection: Pick<ScreeningSelection, 'movieId' | 'theaterId' | 'screen' | 'time' | 'date'>): string {
  return `${selection.date}:${selection.theaterId}:${selection.screen}:${selection.time}:${selection.movieId}`;
}

export function buildSeatGrid(layout: SeatLayout): SeatCell[] {
  const premiumRows = new Set(['A', 'B']);
  const seats: SeatCell[] = [];

  for (const row of layout.rows) {
    for (let number = 1; number <= layout.seatsPerRow; number += 1) {
      seats.push({
        id: `${row}${number}`,
        row,
        number,
        isPremium: premiumRows.has(row),
        isAccessible: row === layout.rows[layout.rows.length - 1] && number <= 2,
      });
    }
  }

  return seats;
}

/** 上映回ごとに固定の「売れ済み」座席を生成（プロトタイプ） */
export function getOccupiedSeatIds(screeningKey: string, layout: SeatLayout): Set<string> {
  const seats = buildSeatGrid(layout);
  let seed = 0;
  for (let i = 0; i < screeningKey.length; i += 1) {
    seed = (seed * 31 + screeningKey.charCodeAt(i)) >>> 0;
  }

  const occupied = new Set<string>();
  const ratio = 0.28 + (seed % 15) / 100;
  const count = Math.floor(seats.length * ratio);

  for (let i = 0; i < count; i += 1) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    occupied.add(seats[seed % seats.length].id);
  }

  return occupied;
}

export function findShowFromParams(params: {
  movieId?: string;
  theater?: string;
  screen?: string;
  time?: string;
  date?: string;
  format?: string;
}): ScreeningSelection | null {
  const { movieId, theater, screen, time, format } = params;
  if (!movieId || !theater || !screen || !time) return null;

  const theaterId = theater as TheaterId;
  const screenSchedule = schedules.find(
    (s) => s.theaterId === theaterId && s.screen === screen,
  );
  if (!screenSchedule) return null;

  const show = screenSchedule.shows.find(
    (s) => s.movieId === movieId && s.start === time && (!format || s.format === format),
  );
  if (!show || show.taken) return null;

  const movie = movies.find((m) => m.id === movieId);
  if (!movie) return null;

  const dateObj = params.date ? new Date(`${params.date}T12:00:00`) : new Date();
  const config = THEATER_CONFIG[theaterId];

  return {
    movieId,
    movieTitle: show.title,
    poster: movie.poster,
    duration: show.duration,
    theaterId,
    theaterName: config.name,
    screen,
    screenNumber: parseScreenNumber(screen),
    conceptName: config.shortLabel,
    time,
    format: show.format,
    date: params.date ?? toISODate(dateObj),
    dateLabel: formatDateLabel(dateObj),
    remainingSeats: show.seats,
  };
}

export function listAvailableShows(date = new Date()): ReserveShowOption[] {
  const iso = toISODate(date);
  const dateLabel = formatDateLabel(date);
  const options: ReserveShowOption[] = [];

  for (const screenSchedule of schedules) {
    const config = THEATER_CONFIG[screenSchedule.theaterId];

    for (const show of screenSchedule.shows) {
      if (show.taken) continue;

      const movie = movies.find((m) => m.id === show.movieId);
      const selection: ScreeningSelection = {
        movieId: show.movieId,
        movieTitle: show.title,
        poster: movie?.poster,
        duration: show.duration,
        theaterId: screenSchedule.theaterId,
        theaterName: config.name,
        screen: screenSchedule.screen,
        screenNumber: parseScreenNumber(screenSchedule.screen),
        conceptName: config.shortLabel,
        time: show.start,
        format: show.format,
        date: iso,
        dateLabel,
        remainingSeats: show.seats,
      };

      options.push({
        ...selection,
        screeningKey: buildScreeningKey(selection),
      });
    }
  }

  return options.sort((a, b) => a.time.localeCompare(b.time));
}

export function calcSeatPrice(ticketTypeId: string, isPremium: boolean): number {
  const ticket = TICKET_TYPES.find((t) => t.id === ticketTypeId) ?? TICKET_TYPES[0];
  return ticket.basePrice + (isPremium ? PREMIUM_SURCHARGE : 0);
}

export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

export function buildReserveUrl(selection: Pick<ScreeningSelection, 'movieId' | 'theaterId' | 'screen' | 'time' | 'date' | 'format'>): string {
  const q = new URLSearchParams({
    movieId: selection.movieId,
    theater: selection.theaterId,
    screen: selection.screen,
    time: selection.time,
    date: selection.date,
    format: selection.format,
  });
  return `/reserve?${q.toString()}`;
}
