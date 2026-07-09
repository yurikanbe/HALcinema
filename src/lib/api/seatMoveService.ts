import { createBookingNumber } from '@/lib/api/bookingPayload';
import type { Prisma } from '@prisma/client';

const HOLD_MINUTES = 15;

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

type Tx = Prisma.TransactionClient;

export async function cascadeCancelRequesterMoves(
  tx: Tx,
  params: {
    screeningId: bigint;
    requesterUserId: string | null;
    requesterBookingId: bigint | null;
    excludeRequestId: bigint;
  },
): Promise<void> {
  const orConditions: Prisma.SeatMoveRequestWhereInput[] = [];
  if (params.requesterUserId) {
    orConditions.push({
      requesterUserId: params.requesterUserId,
      screeningId: params.screeningId,
    });
  }
  if (params.requesterBookingId) {
    orConditions.push({ requesterBookingId: params.requesterBookingId });
  }
  if (orConditions.length === 0) return;

  await tx.seatMoveRequest.updateMany({
    where: {
      status: 'PENDING',
      id: { not: params.excludeRequestId },
      OR: orConditions,
    },
    data: { status: 'CANCELLED', respondedAt: new Date() },
  });
}

export async function ensureRequesterPendingBooking(
  tx: Tx,
  params: { userId: string; screeningId: bigint; now?: Date },
): Promise<{ id: bigint }> {
  const now = params.now ?? new Date();
  const existing = await tx.booking.findFirst({
    where: {
      userId: params.userId,
      screeningId: params.screeningId,
      status: 'PENDING',
      paymentStatus: 'UNPAID',
    },
    select: { id: true },
  });
  if (existing) return existing;

  return tx.booking.create({
    data: {
      userId: params.userId,
      screeningId: params.screeningId,
      bookingNumber: createBookingNumber(),
      bookingType: 'MEMBER',
      totalAmount: 0,
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      expiresAt: addMinutes(now, HOLD_MINUTES),
    },
    select: { id: true },
  });
}

export async function linkPendingMovesToBooking(
  tx: Tx,
  params: { userId: string; screeningId: bigint; bookingId: bigint },
): Promise<void> {
  await tx.seatMoveRequest.updateMany({
    where: {
      requesterUserId: params.userId,
      screeningId: params.screeningId,
      requesterBookingId: null,
      status: { in: ['PENDING', 'APPROVED'] },
    },
    data: { requesterBookingId: params.bookingId },
  });
}

export const SEAT_MOVE_FEE = 100;
export const SEAT_MOVE_CASHBACK = 100;

const REFUNDABLE_MOVE_STATUSES = ['CANCELLED', 'DECLINED', 'EXPIRED'] as const;

/** 決済済み予約で、終了した譲渡リクエストの手数料＋前払いチケット代を返金（未返金分のみ） */
export async function refundInactiveMoveFeesForBooking(
  tx: Tx,
  bookingId: bigint | null | undefined,
): Promise<number> {
  if (!bookingId) return 0;

  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, paymentStatus: true, paymentMethod: true },
  });
  if (!booking || booking.paymentStatus !== 'COMPLETED') return 0;

  const inactiveMoves = await tx.seatMoveRequest.findMany({
    where: {
      requesterBookingId: bookingId,
      status: { in: [...REFUNDABLE_MOVE_STATUSES] },
    },
  });

  let refundedTotal = 0;
  for (const move of inactiveMoves) {
    const refundAmount = move.fee + (move.prepaidUnitPrice ?? 0);
    if (refundAmount <= 0) continue;

    const refundKey = `refund_seat_move_${move.id.toString()}`;
    const existing = await tx.payment.findFirst({
      where: { providerTransactionId: refundKey },
    });
    if (existing) continue;

    await tx.payment.create({
      data: {
        bookingId,
        provider: 'mock',
        providerTransactionId: refundKey,
        method: booking.paymentMethod ?? 'CREDIT_CARD',
        amount: refundAmount,
        status: 'REFUNDED',
        refundedAt: new Date(),
      },
    });
    refundedTotal += refundAmount;
  }

  if (refundedTotal > 0) {
    await recalculateBookingTotalAmount(tx, bookingId);
  }

  return refundedTotal;
}

/** 譲渡リクエスト拒否時: 決済済み予約を全額返金してキャンセル */
export async function refundFullBookingOnTransferDecline(
  tx: Tx,
  bookingId: bigint | null | undefined,
): Promise<number> {
  if (!bookingId) return 0;

  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: { payments: true },
  });
  if (!booking || booking.paymentStatus !== 'COMPLETED') return 0;

  const refundKey = `refund_decline_full_${bookingId.toString()}`;
  const existing = await tx.payment.findFirst({
    where: { providerTransactionId: refundKey },
  });
  if (existing) return 0;

  const completedTotal = booking.payments
    .filter((payment) => payment.status === 'COMPLETED')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const refundedTotal = booking.payments
    .filter((payment) => payment.status === 'REFUNDED')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const netPaid = completedTotal - refundedTotal;
  if (netPaid <= 0) return 0;

  await tx.payment.create({
    data: {
      bookingId,
      provider: 'mock',
      providerTransactionId: refundKey,
      method: booking.paymentMethod ?? 'CREDIT_CARD',
      amount: netPaid,
      status: 'REFUNDED',
      refundedAt: new Date(),
    },
  });

  await tx.screeningSeatLock.deleteMany({ where: { bookingId } });
  await tx.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CANCELLED',
      paymentStatus: 'REFUNDED',
      cancelledAt: new Date(),
    },
  });

  return netPaid;
}

export async function recalculateBookingTotalAmount(tx: Tx, bookingId: bigint): Promise<void> {
  const seatTotal = await tx.bookingSeat.aggregate({
    where: { bookingId },
    _sum: { unitPrice: true },
  });
  const activeMoves = await tx.seatMoveRequest.findMany({
    where: {
      requesterBookingId: bookingId,
      status: { in: ['PENDING', 'APPROVED'] },
    },
    select: { fee: true, status: true, prepaidUnitPrice: true },
  });

  const moveFeeTotal = activeMoves.reduce((sum, move) => sum + move.fee, 0);
  const pendingPrepaidTotal = activeMoves
    .filter((move) => move.status === 'PENDING')
    .reduce((sum, move) => sum + (move.prepaidUnitPrice ?? 0), 0);

  await tx.booking.update({
    where: { id: bookingId },
    data: {
      totalAmount:
        (seatTotal._sum.unitPrice ?? 0) + moveFeeTotal + pendingPrepaidTotal,
    },
  });
}
