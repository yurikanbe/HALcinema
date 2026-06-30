'use client';

import { useState } from 'react';
import shared from '@/styles/shared.module.css';
import type { BookingView } from '@/lib/api/bookingTypes';
import BookingCard from './BookingCard';
import s from './GuestLookupForm.module.css';

interface LookupApiResponse {
  booking?: BookingView;
  error?: string;
}

export default function GuestLookupForm() {
  const [bookingNumber, setBookingNumber] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBooking(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/guest-bookings/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingNumber, guestEmail }),
      });
      const data = (await res.json()) as LookupApiResponse;
      if (!res.ok || !data.booking) {
        throw new Error('予約が見つかりませんでした。予約番号とメールアドレスをご確認ください。');
      }
      setBooking(data.booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予約の照会に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={s.wrap}>
      <form className={s.form} onSubmit={handleSubmit}>
        <label className={s.field}>
          <span>予約番号</span>
          <input
            type="text"
            required
            value={bookingNumber}
            onChange={(e) => setBookingNumber(e.target.value)}
            placeholder="HAL-XXXXXXXX-XXXXXXXX"
          />
        </label>

        <label className={s.field}>
          <span>メールアドレス</span>
          <input
            type="email"
            required
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            autoComplete="email"
          />
        </label>

        <button type="submit" className={`${shared.btn} ${shared.btnSolid}`} disabled={isSubmitting}>
          {isSubmitting ? '照会中' : '予約を照会する'}
        </button>
      </form>

      {error && <div className={s.error}>{error}</div>}

      {booking && (
        <div className={s.result}>
          <BookingCard booking={booking} />
        </div>
      )}
    </div>
  );
}
