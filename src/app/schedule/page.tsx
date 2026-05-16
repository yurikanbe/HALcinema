import type { Metadata } from 'next';
import ScheduleTimeline from '@/components/ScheduleTimeline';

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
      <section className="page-hero">
        <div className="section__hint">Showtime</div>
        <h1 className="page-hero__title">上映スケジュール</h1>
        <p className="page-hero__lead">
          日付を選択し、シアターで絞り込んで上映時間をご確認ください。
          チケットは劇場窓口にてご購入いただけます。
        </p>
      </section>

      <section className="section" style={{ paddingTop: '16px' }}>
        <ScheduleTimeline initialTheater={theater} />
      </section>
    </>
  );
}
