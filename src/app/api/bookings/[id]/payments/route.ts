import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { asBigIntId } from '@/lib/api/bookingPayload';
import { jsonError, jsonOk } from '@/lib/api/response';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const bookingId = asBigIntId(id, 'id');
  const body = await request.json().catch(() => ({}));
  const method = body?.method === 'QR' ? 'QR' : 'CREDIT_CARD';
  const provider = typeof body?.provider === 'string' ? body.provider : 'mock';
  const providerTransactionId =
    typeof body?.providerTransactionId === 'string'
      ? body.providerTransactionId
      : `mock_${crypto.randomUUID()}`;

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { bookingSeats: true },
      });

      if (!existing) throw new Error('Booking not found');
      if (existing.status === 'CANCELLED' || existing.status === 'EXPIRED') {
        throw new Error('Booking is not payable');
      }
      if (existing.expiresAt && existing.expiresAt < new Date()) {
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: 'EXPIRED', paymentStatus: 'FAILED' },
        });
        await tx.screeningSeatLock.deleteMany({
          where: { bookingId, status: 'HELD' },
        });
        throw new Error('Booking hold has expired');
      }

      await tx.payment.create({
        data: {
          bookingId,
          provider,
          providerTransactionId,
          method,
          amount: existing.totalAmount,
          status: 'COMPLETED',
          paidAt: new Date(),
        },
      });

      await tx.screeningSeatLock.updateMany({
        where: { bookingId },
        data: { status: 'CONFIRMED', expiresAt: null },
      });

      return tx.booking.update({
        where: { id: bookingId },
        data: {
          paymentMethod: method,
          paymentStatus: 'COMPLETED',
          status: 'CONFIRMED',
          expiresAt: null,
        },
        include: {
          bookingSeats: { include: { seat: true, ticketType: true } },
          payments: { orderBy: { createdAt: 'desc' } },
          screening: { include: { movie: true, screen: { include: { theater: true } } } },
        },
      });
    });

    return jsonOk({ booking });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return jsonError('Payment transaction already exists', 409);
    }
    return jsonError(error instanceof Error ? error.message : 'Failed to complete payment', 400);
  }
}
