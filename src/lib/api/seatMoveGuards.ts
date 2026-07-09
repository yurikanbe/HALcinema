import { prisma } from '@/lib/prisma';

export class SeatMoveGuardError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'SeatMoveGuardError';
    this.status = status;
  }
}

export async function ensureScreeningAllowsSeatMove(screeningId: bigint): Promise<void> {
  const screening = await prisma.screening.findUnique({
    where: { id: screeningId },
    select: { startTime: true },
  });

  if (!screening) {
    throw new SeatMoveGuardError('Screening not found', 404);
  }

  if (screening.startTime <= new Date()) {
    throw new SeatMoveGuardError('席交換は上映開始前のみ利用できます', 400);
  }
}

export function ensureBookingAllowsSeatMove(status: string): void {
  if (status !== 'CONFIRMED') {
    throw new SeatMoveGuardError('確定済みの予約のみ席交換できます', 400);
  }
}
