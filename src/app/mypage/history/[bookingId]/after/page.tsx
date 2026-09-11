import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { asBigIntId } from '@/lib/api/bookingPayload';
import AfterMovieExperience from '@/components/AfterMovieExperience';
import ConcessionOrderPanel from '@/components/ConcessionOrderPanel';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | 鑑賞後のご案内',
};

export default async function AfterMoviePage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ simulateEnd?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/mypage');

  const { bookingId } = await params;
  const { simulateEnd } = await searchParams;

  let bookingIdBigInt: bigint;
  try {
    bookingIdBigInt = asBigIntId(bookingId, 'bookingId');
  } catch {
    notFound();
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingIdBigInt, userId: session.user.id },
    include: {
      screening: { include: { screen: true, movie: true } },
    },
  });
  if (!booking) notFound();

  const demoSimulate = simulateEnd === '1';

  return (
    <>
      <section className={`${shared.section} ${s.section}`}>
        <Link href={`/mypage/history/${bookingId}/ticket`} className={s.back}>
          ← 電子チケットに戻る
        </Link>
        <AfterMovieExperience bookingId={bookingId} simulateEnd={demoSimulate} />
        <ConcessionOrderPanel
          bookingId={bookingId}
          fromScreenId={booking.screening.screenId.toString()}
        />
      </section>
    </>
  );
}
