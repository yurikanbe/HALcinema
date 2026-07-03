import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { toJsonSafe } from '@/lib/api/response';
import type { BookingView } from '@/lib/api/bookingTypes';
import HistoryList from '@/components/HistoryList';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | 予約履歴',
};

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/mypage');
  }

  const bookings = await prisma.booking.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      screening: {
        include: {
          movie: true,
          screen: { include: { theater: true } },
        },
      },
      bookingSeats: { include: { seat: true, ticketType: true } },
      payments: { orderBy: { createdAt: 'desc' } },
    },
  });

  return (
    <>
      <section className={shared.pageHero}>
        <div className={shared.sectionHint}>Booking History</div>
        <h1 className={shared.pageHeroTitle}>予約履歴</h1>
        <p className={shared.pageHeroLead}>ご利用いただいた予約の履歴です。電子チケットの再表示もこちらから。</p>
      </section>

      <section className={`${shared.section} ${s.section}`}>
        <Link href="/mypage" className={s.back}>
          ← マイページに戻る
        </Link>
        <HistoryList bookings={toJsonSafe(bookings) as unknown as BookingView[]} />
      </section>
    </>
  );
}
