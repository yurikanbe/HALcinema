import { prisma } from '@/lib/prisma';

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export class SeatMoveGuardError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'SeatMoveGuardError';
    this.status = status;
  }
}

export async function ensureScreeningAllowsSeatMove(screeningId: bigint): Promise<{ startTime: Date }> {
  const screening = await prisma.screening.findUnique({
    where: { id: screeningId },
    select: { startTime: true },
  });

  if (!screening) {
    throw new SeatMoveGuardError('上映回が見つかりません', 404);
  }

  const now = new Date();
  if (screening.startTime <= now) {
    throw new SeatMoveGuardError('譲渡リクエストは上映開始前のみ利用できます', 400);
  }

  const cutoff = new Date(screening.startTime.getTime() - THIRTY_MINUTES_MS);
  if (now >= cutoff) {
    throw new SeatMoveGuardError('上映30分前を過ぎているため、譲渡リクエストは利用できません', 400);
  }

  return screening;
}

/** 譲渡対象（先約者）の予約は確定済みのみ */
export function ensureTargetBookingAllowsSeatMove(status: string): void {
  if (status !== 'CONFIRMED') {
    throw new SeatMoveGuardError('確定済みの予約の席のみ譲渡リクエストできます', 400);
  }
}

/** 依頼者側の予約（承認後に紐づく仮予約など） */
export function ensureRequesterBookingAllowsSeatMove(status: string): void {
  if (status !== 'PENDING' && status !== 'CONFIRMED') {
    throw new SeatMoveGuardError('有効な予約でのみ操作できます', 400);
  }
}

/** @deprecated 旧席交換用。新仕様では ensureTargetBookingAllowsSeatMove を使用 */
export function ensureBookingAllowsSeatMove(status: string): void {
  ensureTargetBookingAllowsSeatMove(status);
}
