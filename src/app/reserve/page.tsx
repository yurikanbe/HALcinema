import type { Metadata } from 'next';
import ReserveFlow from '@/components/ReserveFlow';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | オンライン予約',
};

export default async function ReservePage({
  searchParams,
}: {
  searchParams: Promise<{
    movieId?: string;
    theater?: string;
    screen?: string;
    time?: string;
    date?: string;
    format?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <>
      <section className={shared.pageHero}>
        <div className={shared.sectionHint}>Online Reservation</div>
        <h1 className={shared.pageHeroTitle}>オンライン予約</h1>
        <p className={shared.pageHeroLead}>
          上映回と座席を選び、券種を指定して予約まで進められます。本画面は座席予約機能のプロトタイプです。
        </p>
      </section>

      <section className={`${shared.section} ${s.section}`}>
        <ReserveFlow initialParams={params} />
      </section>
    </>
  );
}
