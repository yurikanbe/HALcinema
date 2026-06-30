import type { BookingView } from '@/lib/api/bookingTypes';
import BookingCard from './BookingCard';
import s from './MemberBookingsList.module.css';

export default function MemberBookingsList({ bookings }: { bookings: BookingView[] }) {
  if (bookings.length === 0) {
    return <p className={s.empty}>まだ予約がありません。</p>;
  }

  return (
    <div className={s.list}>
      {bookings.map((booking) => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
    </div>
  );
}
