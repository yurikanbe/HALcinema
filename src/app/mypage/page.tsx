import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { toJsonSafe } from '@/lib/api/response';
import type { BookingView } from '@/lib/api/bookingTypes';
import MemberBookingsList from '@/components/MemberBookingsList';
import GuestLookupForm from '@/components/GuestLookupForm';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | マイページ',
};

export default async function MyPage() {
  const session = await auth();

  if (session?.user) {
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
          <div className={shared.sectionHint}>My Page</div>
          <h1 className={shared.pageHeroTitle}>マイページ</h1>
          <p className={shared.pageHeroLead}>{session.user.name}様の予約状況です。</p>
        </section>

        <section className={`${shared.section} ${s.section}`}>
          <MemberBookingsList bookings={toJsonSafe(bookings) as unknown as BookingView[]} />
        </section>
      </>
    );
  }

  return (
    <>
      <section className={shared.pageHero}>
        <div className={shared.sectionHint}>My Page</div>
        <h1 className={shared.pageHeroTitle}>予約の確認</h1>
        <p className={shared.pageHeroLead}>
          ゲスト予約の方は、予約番号とメールアドレスで予約内容を確認できます。会員の方はログインするとマイページから予約一覧を確認できます。
        </p>
      </section>

      <section className={`${shared.section} ${s.section}`}>
        <GuestLookupForm />
      </section>
    </>
  );
}
