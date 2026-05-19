import type { Metadata } from 'next';
import shared from '@/styles/shared.module.css';
import FaqClient from './FaqClient';

export const metadata: Metadata = {
  title: 'HAL CINEMA | お問い合わせ・FAQ',
  description: 'よくあるご質問とサポート窓口のご案内です。',
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

      <FaqClient />
    </>
  );
}
