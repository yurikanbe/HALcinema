import { prisma } from '@/lib/prisma';
import { jsonError, jsonOk } from '@/lib/api/response';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const bookingNumber = typeof body?.bookingNumber === 'string' ? body.bookingNumber.trim() : '';
  const guestEmail = typeof body?.guestEmail === 'string' ? body.guestEmail.trim() : '';

  if (!bookingNumber || !guestEmail) {
    return jsonError('bookingNumber and guestEmail are both required', 400);
  }

  const booking = await prisma.booking.findFirst({
    where: { bookingNumber, guestEmail },
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
    },
  });

  // どちらの項目が誤りかは漏らさず、共通のメッセージで返す
  if (!booking) {
    return jsonError('Booking not found', 404);
  }

  return jsonOk({ booking });
}
