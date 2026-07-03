'use client';

import Link from 'next/link';
import type { BookingView } from '@/lib/api/bookingTypes';
import shared from '@/styles/shared.module.css';
import s from './TicketCard.module.css';

function formatDateLabel(iso: string): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const date = new Date(iso);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${days[date.getDay()]}）`;
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  }).format(new Date(iso));
}

// 装飾目的の固定QRパターン（実際のQR生成は行わない）
const QR_PATTERN = [
  [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
  [0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1],
  [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0],
  [0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0],
];

function TicketQr() {
  const size = QR_PATTERN.length;
  return (
    <svg
      className={s.qrSvg}
      viewBox={`-1 -1 ${size + 2} ${size + 2}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="入場用QRコード"
    >
      <rect x={-1} y={-1} width={size + 2} height={size + 2} fill="white" />
      {QR_PATTERN.flatMap((row, r) =>
        row.map((cell, c) =>
          cell === 1 ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#0a1633" /> : null,
        ),
      )}
    </svg>
  );
}

export default function TicketCard({ booking }: { booking: BookingView }) {
  return (
    <>
      <div className={s.card}>
        <div className={s.header}>
          <div className={s.eyebrow}>HAL CINEMA — E-TICKET</div>
          <div className={s.movie}>{booking.screening.movie.titleJa}</div>
          <div className={s.theater}>
            {booking.screening.screen.theater?.name} / {booking.screening.screen.conceptName}
          </div>
        </div>

        <div className={s.perforation}>
          <div className={s.notchLeft} />
          <div className={s.notchRight} />
        </div>

        <div className={s.details}>
          <div>
            <div className={s.detailLabel}>日付</div>
            <div className={s.detailValue}>{formatDateLabel(booking.screening.startTime)}</div>
          </div>
          <div>
            <div className={s.detailLabel}>時間</div>
            <div className={s.detailValue}>{formatTime(booking.screening.startTime)}</div>
          </div>
          <div>
            <div className={s.detailLabel}>座席</div>
            <div className={s.detailValue}>
              {booking.bookingSeats.map((seat) => `${seat.seat.rowLabel}${seat.seat.seatNumber}`).join(' ')}
            </div>
          </div>
          <div>
            <div className={s.detailLabel}>スクリーン</div>
            <div className={s.detailValue}>Screen {booking.screening.screen.screenNumber}</div>
          </div>
        </div>

        <div className={s.qrArea}>
          <div className={s.qrLabel}>入場用 QRコード</div>
          <TicketQr />
          <div className={s.ref}>{booking.bookingNumber}</div>
        </div>
      </div>

      <div className={s.actions}>
        <button type="button" className={`${shared.btn} ${shared.btnSolid}`} onClick={() => window.print()}>
          チケットを保存・印刷
        </button>
        <Link href="/mypage/history" className={shared.btn}>
          予約履歴を見る
        </Link>
      </div>
    </>
  );
}
