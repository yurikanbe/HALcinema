import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import GuestLookupForm from '@/components/GuestLookupForm';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | マイページ',
};

export default async function MyPage() {
  const session = await auth();

  if (session?.user) {
    const [member, bookingCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { memberId: true, name: true, visitCount: true },
      }),
      prisma.booking.count({ where: { userId: session.user.id } }),
    ]);

    return (
      <>
        <section className={s.sectionMember}>
          <div className={s.mpHero}>
            <div className={s.mpHeroContent}>
              <div className={s.mpAvatar} aria-hidden="true">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className={s.mpHeroInfo}>
                <div className={s.mpTier}>Member</div>
                <div className={s.mpName}>{member?.name ?? session.user.name}</div>
                <div className={s.mpId}>{member?.memberId ?? '—'}</div>
              </div>
            </div>
            <div className={s.mpStats}>
              <div className={s.mpStat}>
                <div className={s.mpStatValue}>{member?.visitCount ?? 0}</div>
                <div className={s.mpStatLabel}>来場回数</div>
              </div>
              <div className={s.mpStat}>
                <div className={s.mpStatValue}>{bookingCount}</div>
                <div className={s.mpStatLabel}>予約件数</div>
              </div>
            </div>
          </div>

          <div className={s.menuHead}>
            <div className={shared.sectionHint}>Menu</div>
            <h2 className={shared.sectionTitle}>メニュー</h2>
          </div>

          <div className={s.mpMenuGrid}>
            <Link href="/mypage/history" className={s.mpMenuCard}>
              <div className={s.mpMenuCardIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
                  <line x1="9" y1="12" x2="9.01" y2="12" strokeWidth="2" />
                  <line x1="12" y1="12" x2="12.01" y2="12" strokeWidth="2" />
                  <line x1="15" y1="12" x2="15.01" y2="12" strokeWidth="2" />
                </svg>
              </div>
              <div className={s.mpMenuCardTitle}>予約履歴</div>
              <div className={s.mpMenuCardDesc}>過去の予約・電子チケット確認</div>
            </Link>
            <Link href="/mypage/seat-move" className={s.mpMenuCard}>
              <div className={s.mpMenuCardIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 1l4 4-4 4" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <path d="M7 23l-4-4 4-4" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              </div>
              <div className={s.mpMenuCardTitle}>席交換リクエスト</div>
              <div className={s.mpMenuCardDesc}>先約席への交換をリクエスト</div>
            </Link>
            <Link href="/mypage/notifications" className={s.mpMenuCard}>
              <div className={s.mpMenuCardIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <div className={s.mpMenuCardTitle}>通知</div>
              <div className={s.mpMenuCardDesc}>上映終了・アンケート・2本目割引の案内</div>
            </Link>
            <Link href="/mypage/account" className={s.mpMenuCard}>
              <div className={s.mpMenuCardIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className={s.mpMenuCardTitle}>会員情報</div>
              <div className={s.mpMenuCardDesc}>ご登録情報の確認</div>
            </Link>
            <Link href="/mypage/faq" className={s.mpMenuCard}>
              <div className={s.mpMenuCardIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className={s.mpMenuCardTitle}>お問い合わせ・FAQ</div>
              <div className={s.mpMenuCardDesc}>よくあるご質問・サポート</div>
            </Link>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <section className={shared.pageHero}>
        <div className={shared.sectionHint}>My Page</div>
        <h1 className={shared.pageHeroTitle}>予約の確認</h1>
        <p className={shared.pageHeroLead}>
          ゲスト予約の方は、予約番号とメールアドレスで予約内容を確認できます。会員の方はログインするとマイページから予約一覧を確認できます。
        </p>
      </section>

      <section className={`${shared.section} ${s.section}`}>
        <GuestLookupForm />
      </section>
    </>
  );
}
