import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import NotificationToggles from '@/components/NotificationToggles';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | 通知設定',
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/mypage');
  }

  return (
    <>
      <section className={shared.pageHero}>
        <div className={shared.sectionHint}>Notifications</div>
        <h1 className={shared.pageHeroTitle}>通知設定</h1>
        <p className={shared.pageHeroLead}>上映リマインドやキャンペーンの通知をカスタマイズできます。</p>
      </section>

      <section className={`${shared.section} ${s.section}`}>
        <Link href="/mypage" className={s.back}>
          ← マイページに戻る
        </Link>
        <NotificationToggles />
      </section>
    </>
  );
}
