import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { toJsonSafe } from '@/lib/api/response';
import type { BookingView } from '@/lib/api/bookingTypes';
import SeatMoveFlow from '@/components/SeatMoveFlow';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | 席交換リクエスト',
};

export default async function SeatMovePage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/mypage');
  }

  const { bookingId } = await searchParams;

  const bookings = await prisma.booking.findMany({
    where: {
      userId: session.user.id,
      status: 'CONFIRMED',
      screening: { startTime: { gt: new Date() } },
    },
    orderBy: { screening: { startTime: 'asc' } },
    include: {
      screening: {
        include: {
          movie: true,
          screen: { include: { theater: true } },
        },
      },
      bookingSeats: { include: { seat: true, ticketType: true } },
      payments: { orderBy: { createdAt: 'desc' } },
      requestedSeatMoves: {
        include: {
          targetBookingSeat: { include: { seat: true } },
          requesterBookingSeat: { include: { seat: true } },
        },
        orderBy: { requestedAt: 'desc' },
      },
      targetedSeatMoves: {
        include: {
          targetBookingSeat: { include: { seat: true } },
          requesterBookingSeat: { include: { seat: true } },
        },
        orderBy: { requestedAt: 'desc' },
      },
    },
  });

  return (
    <>
      <section className={shared.pageHero}>
        <div className={shared.sectionHint}>Seat Exchange</div>
        <h1 className={shared.pageHeroTitle}>席交換リクエスト</h1>
        <p className={shared.pageHeroLead}>
          先約のある席を希望する場合、{'100'}円で席の交換をリクエストできます。承諾された方には
          {'100'}円のキャッシュバックがあります。
        </p>
      </section>

      <section className={`${shared.section} ${s.section}`}>
        <Link href="/mypage/history" className={s.back}>
          ← 予約履歴に戻る
        </Link>
        <SeatMoveFlow
          bookings={toJsonSafe(bookings) as unknown as BookingView[]}
          initialBookingId={bookingId}
        />
      </section>
    </>
  );
}
