import type { BookingView } from '@/lib/api/bookingTypes';
import { formatYen } from '@/lib/reserveData';
import s from './BookingCard.module.css';

const STATUS_LABEL: Record<string, string> = {
  PENDING: '決済待ち',
  CONFIRMED: '確定',
  CANCELLED: 'キャンセル済み',
  EXPIRED: '期限切れ',
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: '未決済',
  PROCESSING: '決済処理中',
  COMPLETED: '決済完了',
  FAILED: '決済失敗',
  REFUNDED: '返金済み',
};

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  }).format(new Date(iso));
}

export default function BookingCard({ booking }: { booking: BookingView }) {
  return (
    <div className={s.card}>
      <div className={s.header}>
        <span className={s.bookingNumber}>{booking.bookingNumber}</span>
        <span className={s.status}>{STATUS_LABEL[booking.status] ?? booking.status}</span>
      </div>

      <div className={s.movieTitle}>{booking.screening.movie.titleJa}</div>
      <div className={s.meta}>
        {formatDateTime(booking.screening.startTime)} ／ {booking.screening.screen.theater?.name}{' '}
        {booking.screening.screen.conceptName}（Screen {booking.screening.screen.screenNumber}）
      </div>

      <div className={s.seats}>
        {booking.bookingSeats.map((seat) => (
          <span key={seat.id} className={s.seat}>
            {seat.seat.rowLabel}
            {seat.seat.seatNumber}（{seat.ticketType.nameJa}）
          </span>
        ))}
      </div>

      <div className={s.footer}>
        <span>{PAYMENT_STATUS_LABEL[booking.paymentStatus] ?? booking.paymentStatus}</span>
        <strong>{formatYen(booking.totalAmount)}</strong>
      </div>
    </div>
  );
}
