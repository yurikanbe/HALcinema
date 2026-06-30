import type { Metadata } from 'next';
import SignupForm from '@/components/SignupForm';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | 会員登録',
};

export default function SignupPage() {
  return (
    <>
      <section className={shared.pageHero}>
        <div className={shared.sectionHint}>Member Signup</div>
        <h1 className={shared.pageHeroTitle}>会員登録</h1>
        <p className={shared.pageHeroLead}>会員登録すると、予約内容をマイページから確認できます。</p>
      </section>

      <section className={`${shared.section} ${s.section}`}>
        <SignupForm />
      </section>
    </>
  );
}
