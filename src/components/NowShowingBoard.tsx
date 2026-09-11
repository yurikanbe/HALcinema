'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { buildReserveUrl } from '@/lib/reserveData';
import shared from '@/styles/shared.module.css';
import s from './NowShowingBoard.module.css';

interface ShowOption {
  screeningId: string;
  movieId: string;
  movieTitle: string;
  poster?: string;
  date: string;
  time: string;
  dateLabel: string;
  format: string;
  theaterId: string;
  theaterName: string;
  conceptName: string;
  screen: string;
  remainingSeats: number;
}

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

export default function NowShowingBoard() {
  const [shows, setShows] = useState<ShowOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/screenings', { cache: 'no-store' });
        const data = await res.json();
        setShows(data.screenings ?? []);
      } catch {
        setShows([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className={s.loading}>上映情報を読み込んでいます…</div>;
  }

  if (shows.length === 0) {
    return (
      <div className={s.empty}>
        現在予約可能な上映はありません。
        <Link href="/schedule" className={shared.btn}>スケジュールを見る</Link>
      </div>
    );
  }

  return (
    <div className={s.grid}>
      {shows.map((show) => (
        <article key={show.screeningId} className={s.card}>
          <div
            className={s.poster}
            style={show.poster ? { backgroundImage: `url('${show.poster}')` } : undefined}
          />
          <div className={s.body}>
            <h2 className={s.title}>{show.movieTitle}</h2>
            <div className={s.meta}>{show.dateLabel}</div>
            <div className={s.meta}>{show.time} 〜 / {show.format}</div>
            <div className={s.meta}>{show.theaterName} · {show.conceptName} {show.screen}</div>
            <div className={s.seats}>空席 {show.remainingSeats} 席</div>
            <div className={s.note}>通常予約料金（2本目価格は鑑賞後画面のみ）</div>
            <Link
              href={buildReserveUrl({
                movieId: show.movieId,
                theaterId: show.theaterId,
                screen: show.screen,
                time: show.time,
                date: show.date,
                format: show.format,
              })}
              className={`${shared.btn} ${shared.btnSolid}`}
            >
              この上映を予約
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
