import { prisma } from '@/lib/prisma';

/**
 * 上映終了後の予約に対して、アプリ内通知を1回だけ送る。
 * simulateEnd=true のときはデモ用に終了扱いで通知する。
 */
export async function ensureAfterMovieNotifications(params: {
  userId: string;
  now?: Date;
  simulateBookingId?: bigint;
}): Promise<number> {
  const now = params.now ?? new Date();

  const bookings = await prisma.booking.findMany({
    where: {
      userId: params.userId,
      status: 'CONFIRMED',
      paymentStatus: 'COMPLETED',
      isSecondMovie: false,
      afterMovieNotifiedAt: null,
      ...(params.simulateBookingId
        ? { id: params.simulateBookingId }
        : {
            screening: { endTime: { lte: now } },
          }),
    },
    include: {
      screening: { include: { movie: true } },
    },
    take: 20,
  });

  let created = 0;
  for (const booking of bookings) {
    const href = `/mypage/history/${booking.id}/after${
      params.simulateBookingId ? '?simulateEnd=1' : ''
    }`;
    await prisma.$transaction(async (tx) => {
      await tx.userNotification.create({
        data: {
          userId: params.userId,
          bookingId: booking.id,
          kind: 'AFTER_MOVIE',
          title: '映画はいかがでしたか？',
          body: `「${booking.screening.movie.titleJa}」の上映が終了しました。短いアンケートに答えると、2本目が割引価格になります。`,
          href,
        },
      });
      await tx.booking.update({
        where: { id: booking.id },
        data: { afterMovieNotifiedAt: now },
      });
    });
    created += 1;
  }

  return created;
}
