'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import shared from '@/styles/shared.module.css';
import { AFTER_MOVIE_SURVEY } from '@/lib/afterMovieSurvey';
import s from './AfterMovieExperience.module.css';

interface Recommendation {
  screeningId: string;
  movieTitle: string;
  poster?: string;
  startTimeLabel: string;
  screenLabel: string;
  conceptName: string;
  theaterName: string;
  format: string;
  availableSeats: number;
  walkMinutes: number;
  minutesUntilStart: number;
  normalPrice: number;
  secondMoviePrice: number;
}

interface SeatOption {
  id: string;
  label: string;
  isPremium: boolean;
}

interface AfterMovieExperienceProps {
  bookingId: string;
  simulateEnd?: boolean;
}

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

export default function AfterMovieExperience({ bookingId, simulateEnd }: AfterMovieExperienceProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [parentTitle, setParentTitle] = useState('');
  const [fromConcept, setFromConcept] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittingSurvey, setSubmittingSurvey] = useState(false);
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const [seats, setSeats] = useState<SeatOption[]>([]);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showFoodPrompt, setShowFoodPrompt] = useState(true);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const q = new URLSearchParams({ bookingId });
      if (simulateEnd) q.set('simulateEnd', '1');
      const res = await fetch(`/api/second-movie?${q}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '読み込みに失敗しました');

      setEligible(Boolean(data.eligible));
      setSurveyCompleted(Boolean(data.surveyCompleted));
      setReason(data.reason ?? null);
      setParentTitle(data.parentBooking?.movieTitle ?? '');
      setFromConcept(data.parentBooking?.screenConcept ?? '');
      setRecommendations(data.recommendations ?? []);
    } catch (error) {
      setEligible(false);
      setReason(error instanceof Error ? error.message : '読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [bookingId, simulateEnd]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const submitSurvey = async () => {
    if (submittingSurvey) return;
    setSubmittingSurvey(true);
    setMessage(null);
    try {
      const res = await fetch('/api/after-movie/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          answers,
          simulateEnd: !!simulateEnd,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'アンケートの送信に失敗しました');
      setSurveyCompleted(true);
      setMessage(data.message ?? 'アンケート回答完了');
      await loadRecommendations();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'アンケートの送信に失敗しました');
    } finally {
      setSubmittingSurvey(false);
    }
  };

  const openSeatPicker = async (rec: Recommendation) => {
    setSelected(rec);
    setSelectedSeatId(null);
    setSeats([]);
    try {
      const res = await fetch(`/api/screenings/${rec.screeningId}/seats`, { cache: 'no-store' });
      const data = await res.json();
      const available = (data.seats ?? [])
        .filter((seat: { status: string }) => seat.status === 'AVAILABLE')
        .slice(0, 24)
        .map((seat: { id: string; rowLabel: string; seatNumber: number; isPremium: boolean }) => ({
          id: seat.id,
          label: `${seat.rowLabel}${seat.seatNumber}`,
          isPremium: seat.isPremium,
        }));
      setSeats(available);
      if (available.length === 0) {
        setMessage('空席が見つかりませんでした。別の上映をお選びください。');
        setSelected(null);
      }
    } catch {
      setMessage('座席情報の取得に失敗しました。');
      setSelected(null);
    }
  };

  const bookSecondMovie = async () => {
    if (!selected || !selectedSeatId || booking) return;
    setBooking(true);
    setMessage(null);
    try {
      const q = simulateEnd ? '?simulateEnd=1' : '';
      const res = await fetch(`/api/second-movie${q}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentBookingId: bookingId,
          screeningId: selected.screeningId,
          seatId: selectedSeatId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '購入に失敗しました');
      router.push(`/mypage/history/${data.booking.id}/ticket`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '購入に失敗しました');
    } finally {
      setBooking(false);
    }
  };

  const surveyReady = AFTER_MOVIE_SURVEY.every((item) => !!answers[item.id]);

  if (loading) {
    return <div className={s.loading}>おすすめ上映を確認しています…</div>;
  }

  return (
    <div className={s.wrap}>
      <div className={s.hero}>
        <div className={shared.sectionHint}>Stay &amp; Watch More</div>
        <h1 className={s.title}>もう1本観ませんか？</h1>
        <p className={s.lead}>
          {parentTitle ? (
            <>
              「{parentTitle}」鑑賞後 — アンケートに答えると<strong>2本目限定価格</strong>が解放されます。
            </>
          ) : (
            <>鑑賞後のアンケート回答で、2本目が割引になります。</>
          )}
        </p>
        {simulateEnd && (
          <div className={s.demoBadge} role="status">
            デモモード: 上映終了をシミュレート中（通知も送信）
          </div>
        )}
      </div>

      {showFoodPrompt && (
        <div className={s.foodPrompt} role="dialog" aria-labelledby="food-prompt-title">
          <button
            type="button"
            className={s.foodPromptClose}
            aria-label="閉じる"
            onClick={() => setShowFoodPrompt(false)}
          >
            ×
          </button>
          <h2 id="food-prompt-title" className={s.foodPromptTitle}>喉が乾いていませんか？</h2>
          <p className={s.foodPromptText}>
            小腹が空いていませんか？ スクリーン前の受取カウンターでそのままお受け取りできます。
          </p>
          <a href="#concession-order" className={`${shared.btn} ${shared.btnSolid}`}>
            館内フードを注文
          </a>
        </div>
      )}

      {!eligible && (
        <div className={s.empty}>
          <p>{reason ?? '現在、2本目のご案内はありません。'}</p>
          <Link href={`/mypage/history/${bookingId}/ticket`} className={shared.btn}>
            電子チケットに戻る
          </Link>
        </div>
      )}

      {eligible && !surveyCompleted && (
        <section className={s.surveyPanel}>
          <h2 className={s.surveyTitle}>鑑賞アンケート</h2>
          <p className={s.surveyLead}>
            3問に答えると、別スクリーンの直近上映が<strong>2本目限定価格</strong>になります。
          </p>
          {AFTER_MOVIE_SURVEY.map((item) => (
            <fieldset key={item.id} className={s.surveyField}>
              <legend>{item.question}</legend>
              <div className={s.surveyOptions}>
                {item.options.map((option) => (
                  <label key={option} className={s.surveyOption}>
                    <input
                      type="radio"
                      name={item.id}
                      value={option}
                      checked={answers[item.id] === option}
                      onChange={() => setAnswers((prev) => ({ ...prev, [item.id]: option }))}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {message && <p className={s.error}>{message}</p>}
          <button
            type="button"
            className={`${shared.btn} ${shared.btnSolid}`}
            disabled={!surveyReady || submittingSurvey}
            onClick={submitSurvey}
          >
            {submittingSurvey ? '送信中…' : '回答して2本目割引を解放'}
          </button>
        </section>
      )}

      {eligible && surveyCompleted && (
        <>
          <div className={s.unlockBanner} role="status">
            アンケート回答済み — 2本目限定価格が適用されます（{fromConcept} から移動可能な別スクリーン）
          </div>

          {recommendations.length === 0 ? (
            <div className={s.empty}>
              <p>移動時間内に間に合う別スクリーン上映は現在ありません。</p>
              <Link href="/now-showing" className={shared.btn}>
                上映一覧を見る
              </Link>
            </div>
          ) : (
            <div className={s.list}>
              {recommendations.map((rec) => (
                <article key={rec.screeningId} className={s.card}>
                  <div
                    className={s.poster}
                    style={rec.poster ? { backgroundImage: `url('${rec.poster}')` } : undefined}
                  />
                  <div className={s.cardBody}>
                    <h2 className={s.movieTitle}>{rec.movieTitle}</h2>
                    <div className={s.metaGrid}>
                      <div>
                        <span className={s.metaLabel}>上映</span>
                        <strong>{rec.startTimeLabel}</strong>
                      </div>
                      <div>
                        <span className={s.metaLabel}>スクリーン</span>
                        <strong>
                          {rec.conceptName} {rec.screenLabel}
                        </strong>
                      </div>
                      <div>
                        <span className={s.metaLabel}>移動</span>
                        <strong>約{rec.walkMinutes}分</strong>
                      </div>
                      <div>
                        <span className={s.metaLabel}>開始まで</span>
                        <strong>あと{rec.minutesUntilStart}分</strong>
                      </div>
                    </div>
                    <p className={s.moveNote}>
                      {fromConcept}スクリーンから約{rec.walkMinutes}分 — 残り{rec.availableSeats}席
                    </p>
                    <div className={s.priceRow}>
                      <span className={s.normalPrice}>通常 {formatYen(rec.normalPrice)}</span>
                      <strong className={s.secondPrice}>2本目 {formatYen(rec.secondMoviePrice)}</strong>
                    </div>
                    <button
                      type="button"
                      className={`${shared.btn} ${shared.btnSolid}`}
                      onClick={() => openSeatPicker(rec)}
                    >
                      この映画を見る
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {selected && (
        <div className={s.modalBackdrop} role="presentation" onClick={() => setSelected(null)}>
          <div className={s.modal} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3 className={s.modalTitle}>{selected.movieTitle} — 座席を選択</h3>
            <p className={s.modalLead}>
              2本目限定価格 {formatYen(selected.secondMoviePrice)}（プレミアム席 +¥500）
            </p>
            <div className={s.seatGrid}>
              {seats.map((seat) => (
                <button
                  key={seat.id}
                  type="button"
                  className={`${s.seatBtn}${selectedSeatId === seat.id ? ` ${s.seatBtnActive}` : ''}`}
                  onClick={() => setSelectedSeatId(seat.id)}
                >
                  {seat.label}
                  {seat.isPremium ? '★' : ''}
                </button>
              ))}
            </div>
            {message && <p className={s.error}>{message}</p>}
            <div className={s.modalActions}>
              <button type="button" className={shared.btn} onClick={() => setSelected(null)}>
                戻る
              </button>
              <button
                type="button"
                className={`${shared.btn} ${shared.btnSolid}`}
                disabled={!selectedSeatId || booking}
                onClick={bookSecondMovie}
              >
                {booking ? '購入中…' : '2本目で購入する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
