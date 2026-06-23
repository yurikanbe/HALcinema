import {
  buildSeatGrid,
  getOccupiedSeatIds,
  SEAT_LAYOUTS,
  type SeatCell,
  type SeatLayout,
} from '@/lib/reserveData';
import type { OtherOccupant, SeatMoveRequest, StoredBooking } from '@/lib/seatMoveStorage';
import {
  buildSeatRecord,
  cancelAllPendingForRequester,
  createBookingId,
  createBookingSeatId,
  createSeatMoveRequestId,
  getBookingById,
  getIncomingRequests,
  getSeatMoveRequests,
  removeBooking,
  saveSeatMoveRequest,
  setSeatMoveRequests,
  updateBookingSeats,
  updateSeatMoveRequest,
} from '@/lib/seatMoveStorage';

/** database-data-items: seat_move_requests.fee デフォルト */
export const SEAT_MOVE_FEE = 100;

/** database-data-items: seat_move_requests.cashback_amount */
export const SEAT_MOVE_CASHBACK = 100;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** 売れ済み席のうち、自分以外の「他のお客様」席を生成（プロトタイプ） */
export function getOtherOccupants(
  screeningKey: string,
  layout: SeatLayout,
  ownSeatIds: string[],
): OtherOccupant[] {
  const grid = buildSeatGrid(layout);
  const occupied = getOccupiedSeatIds(screeningKey, layout);
  const own = new Set(ownSeatIds);

  return grid
    .filter((seat) => occupied.has(seat.id) && !own.has(seat.id))
    .map((seat) => {
      const seed = hashString(`${screeningKey}:${seat.id}`);
      return {
        bookingId: `mock_bk_${seed % 9999}`,
        bookingSeatId: `mock_bs_${seat.id}_${seed % 999}`,
        seatId: seat.id,
        label: `ゲスト #${(seed % 80) + 10}`,
      };
    })
    .sort((a, b) => a.seatId.localeCompare(b.seatId, undefined, { numeric: true }));
}

export function findOccupantBySeat(
  occupants: OtherOccupant[],
  seatId: string,
): OtherOccupant | undefined {
  return occupants.find((item) => item.seatId === seatId);
}

/** 承諾側が選べる席（空席 + 自分が手放す席 + 相手が提供する席） */
export function getSelectableSeatsForApprover(
  screeningKey: string,
  layout: SeatLayout,
  request: SeatMoveRequest,
  approverOwnSeatIds: string[],
): SeatCell[] {
  const grid = buildSeatGrid(layout);
  const occupied = getOccupiedSeatIds(screeningKey, layout);
  const freed = new Set([request.targetSeatId, request.requesterSeatId].filter(Boolean) as string[]);

  return grid.filter((seat) => {
    if (freed.has(seat.id)) return true;
    if (approverOwnSeatIds.includes(seat.id)) return true;
    return !occupied.has(seat.id);
  });
}

export type ApproverAction =
  | { type: 'reseat'; newSeatId: string }
  | { type: 'cancel' };

/** 拒否時：同一予約の承認待ちリクエストをすべて処理（拒否1件＋他はキャンセル） */
export function applyExchangeDecline(requestId: string): void {
  const request = getSeatMoveRequests().find((item) => item.id === requestId);
  if (!request) return;

  const now = new Date().toISOString();
  setSeatMoveRequests(
    getSeatMoveRequests().map((item) => {
      if (
        item.screeningKey === request.screeningKey &&
        item.requesterBookingId === request.requesterBookingId &&
        item.status === 'pending'
      ) {
        return {
          ...item,
          status: item.id === requestId ? ('declined' as const) : ('cancelled' as const),
          respondedAt: now,
        };
      }
      return item;
    }),
  );
}

/** 承諾時：リクエスト者に希望席を付与し、承諾側は席移動または予約取消 */
export function applyExchangeApproval(
  requestId: string,
  action: ApproverAction,
  layout: SeatLayout,
): boolean {
  const request = getSeatMoveRequests().find((item) => item.id === requestId);
  if (!request) return false;

  const now = new Date().toISOString();
  cancelAllPendingForRequester(request.screeningKey, request.requesterBookingId, requestId);
  updateSeatMoveRequest(requestId, { status: 'approved', respondedAt: now });

  const requesterBooking = getBookingById(request.requesterBookingId);
  if (requesterBooking) {
    if (request.requesterBookingSeatId && request.requesterSeatId) {
      const seats = requesterBooking.seats.map((seat) =>
        seat.id === request.requesterBookingSeatId
          ? { ...seat, seatId: request.targetSeatId }
          : seat,
      );
      updateBookingSeats(requesterBooking.id, seats);
    } else {
      const seats = [...requesterBooking.seats, buildSeatRecord(request.targetSeatId, layout)];
      updateBookingSeats(requesterBooking.id, seats);
    }
  }

  const approverBooking = getBookingById(request.targetBookingId);
  if (action.type === 'cancel') {
    if (approverBooking) removeBooking(request.targetBookingId);
    return true;
  }

  if (approverBooking) {
    const seats = approverBooking.seats.map((seat) =>
      seat.id === request.targetBookingSeatId
        ? { ...seat, seatId: action.newSeatId }
        : seat,
    );
    updateBookingSeats(approverBooking.id, seats);
    return true;
  }

  return true;
}

/** デモ用：希望席のみの交換リクエストを1件生成 */
export function createDemoIncomingRequest(
  targetBookingSeat: { id: string; seatId: string },
): {
  requesterBookingId: string;
  targetBookingSeatId: string;
  targetSeatId: string;
} {
  return {
    requesterBookingId: createBookingId(),
    targetBookingSeatId: targetBookingSeat.id,
    targetSeatId: targetBookingSeat.seatId,
  };
}

/** 受信タブのデモ用リクエストを1件だけ自動生成 */
export function ensureDemoIncomingRequest(booking: StoredBooking): void {
  const existing = getIncomingRequests(booking.id);
  if (existing.length > 0) return;

  const alreadySeeded = getSeatMoveRequests().some(
    (item) => item.targetBookingId === booking.id && item.id.startsWith('demo_'),
  );
  if (alreadySeeded) return;

  const targetSeat = booking.seats[0];
  if (!targetSeat) return;

  const demo = createDemoIncomingRequest(targetSeat);

  saveSeatMoveRequest({
    id: `demo_${createSeatMoveRequestId()}`,
    requesterBookingId: demo.requesterBookingId,
    requesterBookingSeatId: null,
    targetBookingSeatId: demo.targetBookingSeatId,
    targetBookingId: booking.id,
    screeningKey: booking.screeningKey,
    requesterSeatId: null,
    targetSeatId: demo.targetSeatId,
    fee: SEAT_MOVE_FEE,
    cashbackAmount: SEAT_MOVE_CASHBACK,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  });
}

export function getLayoutForTheater(theaterId: keyof typeof SEAT_LAYOUTS) {
  return SEAT_LAYOUTS[theaterId];
}

export function formatRequestLabel(request: SeatMoveRequest): string {
  if (request.requesterSeatId) {
    return `${request.requesterSeatId} ↔ ${request.targetSeatId}`;
  }
  return `${request.targetSeatId} 席を希望`;
}
