import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DevLabPanel from '@/components/DevLabPanel';
import { isDevToolsEnabled } from '@/lib/devTools';
import shared from '@/styles/shared.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | Dev Lab',
  robots: { index: false, follow: false },
};

export default function DevLabPage() {
  if (!isDevToolsEnabled()) {
    notFound();
  }

  return (
    <>
      <section className={shared.pageHero}>
        <div className={shared.sectionHint}>Development</div>
        <h1 className={shared.pageHeroTitle}>開発ラボ</h1>
        <p className={shared.pageHeroLead}>
          複数アカウントの切り替えと、座席譲渡機能の動作確認用ページです。`npm run dev` 実行時のみ利用できます。
        </p>
      </section>

      <section className={shared.section}>
        <DevLabPanel />
      </section>
    </>
  );
}
