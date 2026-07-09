'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import shared from '@/styles/shared.module.css';
import { DEV_DEMO_PASSWORD } from '@/lib/devTools';
import s from './DevLabPanel.module.css';

interface LabBooking {
  id: string;
  bookingNumber: string;
  status: string;
  movieTitle: string;
  startTime: string;
  seats: string[];
  pendingOutgoing: number;
  pendingIncoming: number;
}

interface LabUser {
  id: string;
  email: string;
  name: string;
  role: string;
  hint: string;
  bookings: LabBooking[];
}

interface LabScreening {
  id: string;
  movieTitle: string;
  time: string;
  date: string;
  format: string;
  reserveUrl: string;
}

interface LabData {
  password: string;
  currentUser: { id: string; role: string } | null;
  demoUsers: LabUser[];
  screenings: LabScreening[];
}

export default function DevLabPanel() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [lab, setLab] = useState<LabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingEmail, setSwitchingEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadLab = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dev/lab', { cache: 'no-store' });
      const data = (await res.json()) as LabData & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load dev lab');
      setLab(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLab();
  }, [loadLab, session?.user?.email]);

  const loginAs = async (email: string) => {
    setSwitchingEmail(email);
    setMessage(null);
    setError(null);
    try {
      if (session?.user) {
        await signOut({ redirect: false });
      }
      const result = await signIn('credentials', {
        email,
        password: DEV_DEMO_PASSWORD,
        redirect: false,
      });
      if (result?.error) {
        throw new Error('ログインに失敗しました。デモユーザーを再作成してください。');
      }
      setMessage(`${email} としてログインしました`);
      router.refresh();
      await loadLab();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setSwitchingEmail(null);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    setMessage('ログアウトしました');
    router.refresh();
    await loadLab();
  };

  if (loading && !lab) {
    return <div className={s.section}>開発ラボを読み込んでいます…</div>;
  }

  if (error && !lab) {
    return <div className={`${s.message} ${s.messageError}`}>{error}</div>;
  }

  if (!lab) return null;

  return (
    <div className={s.wrap}>
      <div className={s.banner} role="note">
        <strong>開発専用ページ</strong> — 本番ビルドでは表示されません。
        共通パスワード: <code>{lab.password}</code>
      </div>

      {message && <div className={`${s.message} ${s.messageSuccess}`}>{message}</div>}
      {error && <div className={`${s.message} ${s.messageError}`}>{error}</div>}

      <section className={s.section}>
        <h2 className={s.sectionTitle}>現在のセッション</h2>
        <div className={s.currentUser}>
          <div>
            {status === 'authenticated' && session?.user ? (
              <>
                <strong>{session.user.name ?? session.user.email}</strong>
                <div className={s.accountEmail}>{session.user.email}</div>
              </>
            ) : (
              <span>未ログイン（ゲスト）</span>
            )}
          </div>
          <div className={s.actions}>
            {status === 'authenticated' && (
              <button type="button" className={shared.btn} onClick={handleLogout}>
                ログアウト
              </button>
            )}
            <button type="button" className={shared.btn} onClick={loadLab}>
              状態を更新
            </button>
          </div>
        </div>
      </section>

      <section className={s.section}>
        <h2 className={s.sectionTitle}>デモアカウント切り替え</h2>
        <p className={s.sectionLead}>
          ワンクリックでログインできます。2アカウントの譲渡テストは A → B の順に切り替えてください。
        </p>
        <div className={s.accountGrid}>
          {lab.demoUsers.map((user) => {
            const isActive = session?.user?.email === user.email;
            return (
              <div
                key={user.id}
                className={`${s.accountCard}${isActive ? ` ${s.accountCardActive}` : ''}`}
              >
                <div className={s.accountMeta}>{user.role}</div>
                <div className={s.accountName}>{user.name}</div>
                <div className={s.accountEmail}>{user.email}</div>
                <div className={s.accountHint}>{user.hint}</div>
                {user.bookings.length > 0 && (
                  <div className={s.bookingList}>
                    {user.bookings.map((booking) => (
                      <div key={booking.id} className={s.bookingRow}>
                        {booking.bookingNumber} · {booking.movieTitle} · {booking.seats.join(', ') || '座席なし'}
                        {booking.pendingIncoming > 0 && ` · 受信 ${booking.pendingIncoming} 件`}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className={`${shared.btn} ${shared.btnSolid}`}
                  disabled={isActive || switchingEmail === user.email}
                  onClick={() => loginAs(user.email)}
                >
                  {switchingEmail === user.email
                    ? '切り替え中…'
                    : isActive
                      ? 'ログイン中'
                      : 'このユーザーでログイン'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className={s.section}>
        <h2 className={s.sectionTitle}>座席譲渡のテスト手順</h2>
        <ol className={s.steps}>
          <li>
            <strong>デモユーザーA</strong> でログイン → 下の上映回から予約 → 席を確定
          </li>
          <li>
            <strong>デモユーザーB</strong> に切り替え → 同じ上映回 → 先約席をクリック → 譲渡リクエスト送信
          </li>
          <li>
            再び <strong>A</strong> に切り替え →{' '}
            <Link href="/mypage/seat-move">/mypage/seat-move</Link> で承諾または拒否
          </li>
          <li>
            <strong>B</strong> に戻る → 予約フローの確認画面で承認済み席を確認 → 決済
          </li>
        </ol>
      </section>

      <section className={s.section}>
        <h2 className={s.sectionTitle}>クイックリンク</h2>
        <div className={s.linkGrid}>
          <Link href="/reserve" className={s.quickLink}>
            オンライン予約
          </Link>
          <Link href="/mypage/seat-move" className={s.quickLink}>
            譲渡リクエスト応答
          </Link>
          <Link href="/mypage/history" className={s.quickLink}>
            予約履歴
          </Link>
          <Link href="/login" className={s.quickLink}>
            通常ログイン
          </Link>
        </div>
      </section>

      <section className={s.section}>
        <h2 className={s.sectionTitle}>直近の上映回（ワンクリック予約）</h2>
        <p className={s.sectionLead}>同じ上映回を選ぶと、譲渡テストがしやすくなります。</p>
        <div className={s.screeningList}>
          {lab.screenings.length === 0 ? (
            <div>予約可能な上映回がありません。`npm run db:seed` を実行してください。</div>
          ) : (
            lab.screenings.map((screening) => (
              <div key={screening.id} className={s.screeningRow}>
                <span>
                  {screening.movieTitle} · {screening.date} {screening.time} · {screening.format}
                </span>
                <Link href={screening.reserveUrl} className={`${shared.btn} ${shared.btnSolid}`}>
                  この回を予約
                </Link>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
