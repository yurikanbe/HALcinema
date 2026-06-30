import type { Metadata } from 'next';
import LoginForm from '@/components/LoginForm';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | ログイン',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <>
      <section className={shared.pageHero}>
        <div className={shared.sectionHint}>Member Login</div>
        <h1 className={shared.pageHeroTitle}>ログイン</h1>
        <p className={shared.pageHeroLead}>会員登録済みのメールアドレスとパスワードでログインしてください。</p>
      </section>

      <section className={`${shared.section} ${s.section}`}>
        <LoginForm callbackUrl={callbackUrl} />
      </section>
    </>
  );
}
