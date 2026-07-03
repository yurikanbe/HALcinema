import type { Metadata } from 'next';
import Link from 'next/link';
import FaqList from '@/components/FaqList';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | お問い合わせ・FAQ',
};

export default function FaqPage() {
  return (
    <>
      <section className={shared.pageHero}>
        <div className={shared.sectionHint}>FAQ &amp; Support</div>
        <h1 className={shared.pageHeroTitle}>お問い合わせ・FAQ</h1>
        <p className={shared.pageHeroLead}>
          よくあるご質問とサポート窓口のご案内です。お気軽にお問い合わせください。
        </p>
      </section>

      <section className={`${shared.section} ${s.section}`}>
        <Link href="/mypage" className={s.back}>
          ← マイページに戻る
        </Link>
        <FaqList />
      </section>
    </>
  );
}
