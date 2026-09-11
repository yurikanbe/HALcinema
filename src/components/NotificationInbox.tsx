'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import shared from '@/styles/shared.module.css';
import s from './NotificationInbox.module.css';

interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationInboxProps {
  /** デモ用: この予約を上映終了扱いで通知する */
  simulateBookingId?: string;
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(new Date(iso));
}

export default function NotificationInbox({ simulateBookingId }: NotificationInboxProps) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (simulateBookingId) q.set('simulateBookingId', simulateBookingId);
      const res = await fetch(`/api/notifications${q.toString() ? `?${q}` : ''}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '通知の取得に失敗しました');
      setItems(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '通知の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [simulateBookingId]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 20000);
    return () => window.clearInterval(timer);
  }, [load]);

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    setItems((prev) =>
      prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
    );
    setUnreadCount(0);
  };

  if (loading && items.length === 0) {
    return <div className={s.loading}>通知を確認しています…</div>;
  }

  return (
    <div className={s.wrap}>
      <div className={s.toolbar}>
        <div>
          未読 <strong>{unreadCount}</strong> 件
          <span className={s.hint}>（上映終了後に自動で届きます）</span>
        </div>
        <div className={s.toolbarActions}>
          <button type="button" className={shared.btn} onClick={load}>
            更新
          </button>
          <button type="button" className={shared.btn} onClick={markAllRead} disabled={unreadCount === 0}>
            すべて既読
          </button>
        </div>
      </div>

      {error && <p className={s.error}>{error}</p>}

      {items.length === 0 ? (
        <div className={s.empty}>通知はまだありません。映画終了後にここに届きます。</div>
      ) : (
        <ul className={s.list}>
          {items.map((item) => (
            <li key={item.id} className={`${s.item}${item.readAt ? '' : ` ${s.itemUnread}`}`}>
              <div className={s.itemMeta}>{formatWhen(item.createdAt)}</div>
              <div className={s.itemTitle}>{item.title}</div>
              <p className={s.itemBody}>{item.body}</p>
              <div className={s.itemActions}>
                {item.href && (
                  <Link
                    href={item.href}
                    className={`${shared.btn} ${shared.btnSolid}`}
                    onClick={() => markRead(item.id)}
                  >
                    開く
                  </Link>
                )}
                {!item.readAt && (
                  <button type="button" className={shared.btn} onClick={() => markRead(item.id)}>
                    既読にする
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
