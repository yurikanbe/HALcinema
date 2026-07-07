'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { BookingView } from '@/lib/api/bookingTypes';
import s from './HistoryList.module.css';

type Filter = 'all' | 'upcoming' | 'used';

function formatDateLabel(iso: string): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const date = new Date(iso);
  return `${date.getMonth() + 1}月${date.getDate()}日（${days[date.getDay()]}）`;
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  }).format(new Date(iso));
}

export default function HistoryList({ bookings }: { bookings: BookingView[] }) {
  const [filter, setFilter] = useState<Filter>('all');

  const items = useMemo(() => {
    return bookings.map((booking) => ({
      booking,
      isUpcoming:
        booking.status !== 'CANCELLED' && new Date(booking.screening.startTime).getTime() > Date.now(),
    }));
  }, [bookings]);

  const filtered = items.filter(({ isUpcoming }) => {
    if (filter === 'all') return true;
    return filter === 'upcoming' ? isUpcoming : !isUpcoming;
  });

  if (bookings.length === 0) {
    return (
      <div className={s.empty}>
        <div className={s.emptyText}>予約履歴がありません</div>
        <Link href="/schedule" className={s.emptyCta}>
          上映スケジュールを見る
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className={s.filterRow}>
        <button
          type="button"
          className={`${s.filterBtn} ${filter === 'all' ? s.filterBtnActive : ''}`}
          onClick={() => setFilter('all')}
        >
          すべて
        </button>
        <button
          type="button"
          className={`${s.filterBtn} ${filter === 'upcoming' ? s.filterBtnActive : ''}`}
          onClick={() => setFilter('upcoming')}
        >
          今後の予約
        </button>
        <button
          type="button"
          className={`${s.filterBtn} ${filter === 'used' ? s.filterBtnActive : ''}`}
          onClick={() => setFilter('used')}
        >
          使用済み
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className={s.empty}>
          <div className={s.emptyText}>該当する予約がありません</div>
        </div>
      ) : (
        <div className={s.list}>
          {filtered.map(({ booking, isUpcoming }) => (
            <div key={booking.id} className={s.item}>
              <Link href={`/mypage/history/${booking.id}/ticket`} className={s.itemLink}>
                <div
                  className={s.poster}
                  style={
                    booking.screening.movie.posterImageUrl
                      ? { backgroundImage: `url('${booking.screening.movie.posterImageUrl}')` }
                      : undefined
                  }
                />
                <div>
                  <div className={s.movie}>{booking.screening.movie.titleJa}</div>
                  <div className={s.meta}>
                    {formatDateLabel(booking.screening.startTime)} {formatTime(booking.screening.startTime)}
                  </div>
                  <div className={s.meta}>
                    {booking.screening.screen.theater?.name} {booking.screening.screen.conceptName}（Screen{' '}
                    {booking.screening.screen.screenNumber}）
                  </div>
                  <div className={s.seats}>
                    座席: {booking.bookingSeats.map((seat) => `${seat.seat.rowLabel}${seat.seat.seatNumber}`).join(', ')}
                  </div>
                </div>
                <span className={`${s.badge} ${isUpcoming ? s.badgeUpcoming : s.badgeUsed}`}>
                  {isUpcoming ? '予約済み' : '使用済み'}
                </span>
              </Link>
              {isUpcoming && booking.status === 'CONFIRMED' && (
                <Link href={`/mypage/seat-move?bookingId=${booking.id}`} className={s.seatMoveLink}>
                  席交換リクエスト
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
