import type { ScreeningSelection, SeatCell } from '@/lib/reserveData';
import { calcSeatPrice, buildSeatGrid, type SeatLayout } from '@/lib/reserveData';

/** database-data-items: booking_seats に相当 */
export interface StoredBookingSeat {
  id: string;
  seatId: string;
  ticketTypeId: string;
  unitPrice: number;
}

/** database-data-items: bookings に相当 */
export interface StoredBooking {
  id: string;
  bookingNumber: string;
  screeningKey: string;
  selection: ScreeningSelection;
  seats: StoredBookingSeat[];
  totalAmount: number;
  createdAt: string;
}

export type SeatMoveStatus = 'pending' | 'approved' | 'declined' | 'expired' | 'cancelled';

/** database-data-items: seat_move_requests に相当 */
export interface SeatMoveRequest {
  id: string;
  requesterBookingId: string;
  /** リクエスト送信者が提供する席（任意） */
  requesterBookingSeatId?: string | null;
  targetBookingSeatId: string;
  targetBookingId: string;
  screeningKey: string;
  /** リクエスト送信者が提供する席番号（任意） */
  requesterSeatId?: string | null;
  /** 希望する席番号 */
  targetSeatId: string;
  fee: number;
  cashbackAmount: number;
  status: SeatMoveStatus;
  requestedAt: string;
  respondedAt?: string;
}

export interface OtherOccupant {
  bookingId: string;
  bookingSeatId: string;
  seatId: string;
  label: string;
}

const BOOKINGS_KEY = 'halcinema_bookings';
const SEAT_MOVE_KEY = 'halcinema_seat_move_requests';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getBookings(): StoredBooking[] {
  return readJson<StoredBooking[]>(BOOKINGS_KEY, []);
}

export function saveBooking(booking: StoredBooking): void {
  const list = getBookings();
  writeJson(BOOKINGS_KEY, [booking, ...list.filter((item) => item.id !== booking.id)]);
}

export function getBookingById(id: string): StoredBooking | undefined {
  return getBookings().find((item) => item.id === id);
}

export function removeBooking(bookingId: string): void {
  writeJson(
    BOOKINGS_KEY,
    getBookings().filter((item) => item.id !== bookingId),
  );
}

export function updateBookingSeats(bookingId: string, seats: StoredBookingSeat[]): void {
  const list = getBookings().map((booking) =>
    booking.id === bookingId
      ? {
          ...booking,
          seats,
          totalAmount: seats.reduce((sum, seat) => sum + seat.unitPrice, 0),
        }
      : booking,
  );
  writeJson(BOOKINGS_KEY, list);
}

export function getSeatMoveRequests(): SeatMoveRequest[] {
  return readJson<SeatMoveRequest[]>(SEAT_MOVE_KEY, []);
}

export function setSeatMoveRequests(requests: SeatMoveRequest[]): void {
  writeJson(SEAT_MOVE_KEY, requests);
}

export function saveSeatMoveRequest(request: SeatMoveRequest): void {
  const list = getSeatMoveRequests();
  writeJson(SEAT_MOVE_KEY, [request, ...list.filter((item) => item.id !== request.id)]);
}

export function updateSeatMoveRequest(
  id: string,
  patch: Partial<Pick<SeatMoveRequest, 'status' | 'respondedAt'>>,
): SeatMoveRequest | undefined {
  let updated: SeatMoveRequest | undefined;
  const list = getSeatMoveRequests().map((item) => {
    if (item.id !== id) return item;
    updated = { ...item, ...patch };
    return updated;
  });
  writeJson(SEAT_MOVE_KEY, list);
  return updated;
}

function writeSeatMoveRequests(requests: SeatMoveRequest[]): void {
  writeJson(SEAT_MOVE_KEY, requests);
}

/** 同一予約・同一上映回の承認待ちリクエストをすべてキャンセル */
export function cancelAllPendingForRequester(
  screeningKey: string,
  requesterBookingId: string,
  exceptId?: string,
): void {
  const now = new Date().toISOString();
  writeSeatMoveRequests(
    getSeatMoveRequests().map((item) => {
      if (
        item.screeningKey === screeningKey &&
        item.requesterBookingId === requesterBookingId &&
        item.status === 'pending' &&
        item.id !== exceptId
      ) {
        return { ...item, status: 'cancelled' as const, respondedAt: now };
      }
      return item;
    }),
  );
}

export function getOutgoingRequests(bookingId: string): SeatMoveRequest[] {
  return getSeatMoveRequests().filter((item) => item.requesterBookingId === bookingId);
}

export function getIncomingRequests(bookingId: string): SeatMoveRequest[] {
  return getSeatMoveRequests().filter(
    (item) => item.targetBookingId === bookingId && item.status === 'pending',
  );
}

export function createBookingSeatId(): string {
  return `bs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createBookingId(): string {
  return `bk_${Date.now().toString(36)}`;
}

export function createSeatMoveRequestId(): string {
  return `sm_${Date.now().toString(36)}`;
}

export function findSeatInGrid(seatId: string, grid: SeatCell[]): SeatCell | undefined {
  return grid.find((seat) => seat.id === seatId);
}

export function buildSeatRecord(seatId: string, layout: SeatLayout): StoredBookingSeat {
  const cell = findSeatInGrid(seatId, buildSeatGrid(layout));
  return {
    id: createBookingSeatId(),
    seatId,
    ticketTypeId: 'general',
    unitPrice: calcSeatPrice('general', cell?.isPremium ?? false),
  };
}
