import type { Metadata } from 'next';
import SeatMoveFlow from '@/components/SeatMoveFlow';
import shared from '@/styles/shared.module.css';
import s from '../page.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | 席交換リクエスト',
};

export default async function SeatMovePage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const { bookingId } = await searchParams;

  return (
    <>
      <section className={shared.pageHero}>
        <div className={shared.sectionHint}>Seat Exchange</div>
        <h1 className={shared.pageHeroTitle}>席交換リクエスト</h1>
        <p className={shared.pageHeroLead}>
          先約のある席を希望する場合、席の交換をリクエストできます。承諾された方は別の席を選ぶか、予約をキャンセルできます。
        </p>
      </section>

      <section className={`${shared.section} ${s.section}`}>
        <SeatMoveFlow initialBookingId={bookingId} />
      </section>
    </>
  );
}
