import { prisma } from '@/lib/prisma';
import { asBigIntId } from '@/lib/api/bookingPayload';
import { jsonError, jsonOk } from '@/lib/api/response';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const bookingId = asBigIntId(id, 'id');

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      screening: {
        include: {
          movie: true,
          screen: {
            include: { theater: true },
          },
        },
      },
      bookingSeats: {
        include: {
          seat: true,
          ticketType: true,
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
      requestedSeatMoves: true,
      targetedSeatMoves: true,
    },
  });

  if (!booking) {
    return jsonError('Booking not found', 404);
  }

  return jsonOk({ booking });
}
