import type { Metadata } from 'next';
import ScheduleTimeline from '@/components/ScheduleTimeline';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | 上映スケジュール',
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ theater?: string }>;
}) {
  const { theater } = await searchParams;

  return (
    <>
      <section className={shared.pageHero}>
        <div className={shared.sectionHint}>Showtime</div>
        <h1 className={shared.pageHeroTitle}>上映スケジュール</h1>
        <p className={shared.pageHeroLead}>
          日付を選択し、シアターで絞り込んで上映時間をご確認ください。
          回をクリックするとオンライン予約へ進めます。
        </p>
      </section>

      <section className={`${shared.section} ${s.sectionPt}`}>
        <ScheduleTimeline initialTheater={theater} />
      </section>
    </>
  );
}
