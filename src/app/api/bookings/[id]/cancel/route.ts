import { prisma } from '@/lib/prisma';
import { asBigIntId } from '@/lib/api/bookingPayload';
import { jsonError, jsonOk } from '@/lib/api/response';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const bookingId = asBigIntId(id, 'id');

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { screening: true },
      });

      if (!existing) throw new Error('Booking not found');
      if (existing.status === 'CANCELLED') throw new Error('Booking is already cancelled');
      if (existing.screening.startTime.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
        throw new Error('Bookings can only be cancelled until 24 hours before screening');
      }

      await tx.screeningSeatLock.deleteMany({
        where: { bookingId },
      });

      return tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          paymentStatus: existing.paymentStatus === 'COMPLETED' ? 'REFUNDED' : 'FAILED',
        },
        include: {
          bookingSeats: { include: { seat: true, ticketType: true } },
          payments: { orderBy: { createdAt: 'desc' } },
        },
      });
    });

    return jsonOk({ booking });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Failed to cancel booking', 400);
  }
}
