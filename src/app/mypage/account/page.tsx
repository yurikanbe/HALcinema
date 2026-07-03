import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AccountPanel from '@/components/AccountPanel';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | 会員情報',
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/mypage');
  }

  const member = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, memberId: true },
  });

  return (
    <>
      <section className={shared.pageHero}>
        <div className={shared.sectionHint}>Account</div>
        <h1 className={shared.pageHeroTitle}>会員情報</h1>
        <p className={shared.pageHeroLead}>登録情報の確認・更新ができます。</p>
      </section>

      <section className={`${shared.section} ${s.section}`}>
        <Link href="/mypage" className={s.back}>
          ← マイページに戻る
        </Link>

        <AccountPanel
          name={member?.name ?? session.user.name ?? ''}
          email={member?.email ?? session.user.email ?? ''}
          memberId={member?.memberId ?? 'HAL-000'}
        />
      </section>
    </>
  );
}
