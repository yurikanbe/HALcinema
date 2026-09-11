import type { Metadata } from 'next';
import NowShowingBoard from '@/components/NowShowingBoard';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | 上映中・近日上映',
};

export default function NowShowingPage() {
  return (
    <>
      <section className={shared.pageHero}>
        <div className={shared.sectionHint}>Now Showing</div>
        <h1 className={shared.pageHeroTitle}>上映中・近日上映</h1>
        <p className={shared.pageHeroLead}>
          API から取得した上映回と空席状況です。通常予約はこちらから、2本目限定価格は1本目鑑賞後の専用画面でのみ適用されます。
        </p>
      </section>
      <section className={`${shared.section} ${s.section}`}>
        <NowShowingBoard />
      </section>
    </>
  );
}
