import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { toJsonSafe } from '@/lib/api/response';
import { asBigIntId } from '@/lib/api/bookingPayload';
import type { BookingView } from '@/lib/api/bookingTypes';
import TicketCard from '@/components/TicketCard';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | 電子チケット',
};

export default async function TicketPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect('/mypage');
  }

  let bookingIdBigInt: bigint;
  try {
    bookingIdBigInt = asBigIntId(bookingId, 'bookingId');
  } catch {
    notFound();
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingIdBigInt, userId: session.user.id },
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

  if (!booking) {
    notFound();
  }

  return (
    <section className={`${shared.section} ${s.section}`}>
      <div className={s.back}>
        <Link href="/mypage/history" className={s.backLink}>
          ← 予約履歴に戻る
        </Link>
      </div>
      <div className={s.heading}>
        <div className={shared.sectionHint}>E-Ticket</div>
        <h1 className={s.headingTitle}>電子チケット</h1>
      </div>

      <TicketCard booking={toJsonSafe(booking) as unknown as BookingView} />
    </section>
  );
}
