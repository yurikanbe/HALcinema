'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import shared from '@/styles/shared.module.css';
import { formatYen } from '@/lib/reserveData';
import type { BookingView, SeatMoveRequestView } from '@/lib/api/bookingTypes';
import s from './SeatMoveFlow.module.css';

const SEAT_MOVE_CASHBACK = 100;

const CASCADE_NOTICE =
  '同じ上映回に複数の席へリクエストを送った場合、いずれか1件が拒否または承諾されると、残りの承認待ちリクエストは連鎖的に自動キャンセルされます。';

const CASCADE_CANCELLED_NOTICE =
  '表示が「連鎖キャンセル」となっているリクエストは、同じ上映回の別リクエストが拒否または承諾された結果、自動的にキャンセルされたものです。';

const STATUS_DETAIL: Partial<Record<SeatMoveRequestView['status'], string>> = {
  DECLINED: '相手がこのリクエストを拒否しました。同じ上映回の他の承認待ちリクエストも連鎖的にキャンセルされています。',
  CANCELLED: '同じ上映回の別リクエストが拒否または承諾されたため、このリクエストは連鎖的に自動キャンセルされました。',
  APPROVED: '座席譲渡が成立しました。同じ上映回の他の承認待ちリクエストは連鎖的にキャンセルされています。',
};

const SEAT_MOVE_FLASH_KEY = 'seatMoveFlashMessage';

type ApproveStep = 'choose' | 'pick-seat' | 'confirm-cancel';

const STATUS_LABEL: Record<SeatMoveRequestView['status'], string> = {
  PENDING: '承認待ち',
  APPROVED: '承認済み',
  DECLINED: '拒否',
  EXPIRED: '期限切れ',
  CANCELLED: '連鎖キャンセル',
};

interface ScreeningSeat {
  id: string;
  rowLabel: string;
  seatNumber: number;
  isPremium: boolean;
  isAccessible: boolean;
  status: 'AVAILABLE' | 'HELD' | 'CONFIRMED';
  bookingSeatId: string | null;
  bookingId: string | null;
}

function seatLabel(row: string, number: number): string {
  return `${row}${number}`;
}

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

interface SeatMoveFlowProps {
  bookings: BookingView[];
  initialBookingId?: string;
}

export default function SeatMoveFlow({ bookings, initialBookingId }: SeatMoveFlowProps) {
  const [activeBookingId, setActiveBookingId] = useState<string | null>(initialBookingId ?? bookings[0]?.id ?? null);
  const [seats, setSeats] = useState<ScreeningSeat[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);
  const [decliningRequestId, setDecliningRequestId] = useState<string | null>(null);
  const [approveStep, setApproveStep] = useState<ApproveStep | null>(null);
  const [pickedSeatId, setPickedSeatId] = useState<string | null>(null);

  const activeBooking = useMemo(
    () => bookings.find((item) => item.id === activeBookingId) ?? bookings[0] ?? null,
    [bookings, activeBookingId],
  );

  const resetApproveFlow = () => {
    setRespondingRequestId(null);
    setDecliningRequestId(null);
    setApproveStep(null);
    setPickedSeatId(null);
  };

  const loadSeats = useCallback(async (screeningId: string) => {
    setLoadingSeats(true);
    try {
      const res = await fetch(`/api/screenings/${screeningId}/seats`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load seats');
      setSeats(data.seats);
    } catch (err) {
      setError(err instanceof Error ? err.message : '座席情報の取得に失敗しました。');
    } finally {
      setLoadingSeats(false);
    }
  }, []);

  useEffect(() => {
    if (!activeBooking?.screening.id) return;
    loadSeats(activeBooking.screening.id);
  }, [activeBooking?.screening.id, loadSeats]);

  useEffect(() => {
    const flash = sessionStorage.getItem(SEAT_MOVE_FLASH_KEY);
    if (!flash) return;
    sessionStorage.removeItem(SEAT_MOVE_FLASH_KEY);
    setMessage(flash);
  }, []);

  // 同一上映回に自分の予約が複数ある場合、他の自分の予約の座席も「自分の席」として除外する
  // （API側は予約単位ではなくユーザー単位で所有権を判定するため、表示もそれに合わせる）
  const ownSeatIds = useMemo(() => {
    const screeningId = activeBooking?.screening.id;
    const seatIds = bookings
      .filter((booking) => booking.screening.id === screeningId)
      .flatMap((booking) => booking.bookingSeats.map((seat) => seatLabel(seat.seat.rowLabel, seat.seat.seatNumber)));
    return new Set(seatIds);
  }, [bookings, activeBooking]);

  const incoming = activeBooking?.targetedSeatMoves?.filter((item) => item.status === 'PENDING') ?? [];

  const cascadeCancelledForScreening = useMemo(() => {
    if (!activeBooking) return [];
    const screeningId = activeBooking.screening.id;
    return bookings
      .filter((booking) => booking.screening.id === screeningId)
      .flatMap((booking) => booking.requestedSeatMoves ?? [])
      .filter((item) => item.status === 'CANCELLED');
  }, [bookings, activeBooking]);

  const respondingRequest = respondingRequestId
    ? incoming.find((item) => item.id === respondingRequestId) ?? null
    : null;

  const approverSelectableSeats = useMemo(() => {
    if (!respondingRequest) return [];
    const freedSeat = seatLabel(
      respondingRequest.targetBookingSeat.seat.rowLabel,
      respondingRequest.targetBookingSeat.seat.seatNumber,
    );
    return seats.filter((seat) => {
      const label = seatLabel(seat.rowLabel, seat.seatNumber);
      if (label === freedSeat) return true;
      if (ownSeatIds.has(label)) return true;
      return seat.status === 'AVAILABLE';
    });
  }, [respondingRequest, seats, ownSeatIds]);

  const refresh = () => {
    window.location.reload();
  };

  const respond = async (
    requestId: string,
    action: 'decline' | 'approve_reseat' | 'approve_cancel',
    newSeatId?: string,
  ) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/seat-moves/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, newSeatId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '処理に失敗しました。');
      resetApproveFlow();
      if (action === 'decline') {
        sessionStorage.setItem(
          SEAT_MOVE_FLASH_KEY,
          'リクエストを拒否しました。依頼者が同じ上映回に送っている他の承認待ちリクエストも、連鎖的に自動キャンセルされます。',
        );
      } else {
        sessionStorage.setItem(
          SEAT_MOVE_FLASH_KEY,
          '座席譲渡を承諾しました。依頼者の同じ上映回への他の承認待ちリクエストは、連鎖的に自動キャンセルされています。',
        );
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '処理に失敗しました。');
      setSubmitting(false);
    }
  };

  if (bookings.length === 0) {
    return (
      <div className={s.flow}>
        <div className={s.backRow}>
          <BackButton className={s.backBtn} />
        </div>
        <div className={s.emptyPanel}>
          <div className={shared.sectionHint}>Seat Transfer</div>
          <h2 className={s.emptyTitle}>対象の予約が見つかりません</h2>
          <p className={s.emptyLead}>
            譲渡リクエストへの応答は、決済完了済みで上映開始前の予約が対象です。送信は予約フローから行えます。
          </p>
          <Link href="/reserve" className={`${shared.btn} ${shared.btnSolid}`}>
            オンライン予約へ
          </Link>
        </div>
      </div>
    );
  }

  const theaterName = activeBooking?.screening.screen.theater?.name ?? '';

  return (
    <div className={s.flow}>
      <div className={s.backRow}>
        <BackButton className={s.backBtn} />
      </div>

      <div className={s.introPanel}>
        <div className={shared.sectionHint}>Seat Transfer</div>
        <h2 className={s.introTitle}>届いた譲渡リクエスト</h2>
        <p className={s.introLead}>
          先約者として、依頼者から届いた座席譲渡リクエストに応答できます。承諾時のキャッシュバックは
          {formatYen(SEAT_MOVE_CASHBACK)} です（DB記録のみ）。上映開始後は応答できません。
        </p>
        <p className={s.introLead}>
          譲渡リクエストの<strong>送信</strong>は <Link href="/reserve">オンライン予約</Link> の座席選択画面から行います。
        </p>
        <div className={s.noticeBox} role="note">
          <div className={s.noticeTitle}>連鎖キャンセルについて</div>
          <p className={s.noticeText}>{CASCADE_NOTICE}</p>
          <p className={s.noticeTextSub}>{CASCADE_CANCELLED_NOTICE}</p>
        </div>
      </div>

      <div className={s.bookingPicker}>
        <label className={s.bookingPickerLabel} htmlFor="booking-select">
          対象の予約
        </label>
        <select
          id="booking-select"
          className={s.bookingSelect}
          value={activeBooking?.id ?? ''}
          onChange={(e) => {
            setActiveBookingId(e.target.value);
            setMessage(null);
            setError(null);
            resetApproveFlow();
          }}
        >
          {bookings.map((booking) => (
            <option key={booking.id} value={booking.id}>
              {booking.bookingNumber} · {booking.screening.movie.titleJa} ·{' '}
              {booking.bookingSeats.map((seat) => seatLabel(seat.seat.rowLabel, seat.seat.seatNumber)).join(', ')}
            </option>
          ))}
        </select>
      </div>

      {activeBooking && (
        <div className={s.summaryBar}>
          <div>
            <div className={s.summaryEyebrow}>{formatDateLabel(activeBooking.screening.startTime)}</div>
            <div className={s.summaryTitle}>{activeBooking.screening.movie.titleJa}</div>
            <div className={s.summaryMeta}>
              {theaterName} {activeBooking.screening.screen.conceptName} · Screen{' '}
              {activeBooking.screening.screen.screenNumber} · {formatTime(activeBooking.screening.startTime)} 開始
            </div>
            <div className={s.summarySeats}>
              あなたの席: {activeBooking.bookingSeats.map((seat) => seatLabel(seat.seat.rowLabel, seat.seat.seatNumber)).join(' · ')}
            </div>
          </div>
        </div>
      )}

      {message && <div className={s.messageSuccess}>{message}</div>}
      {error && <div className={s.messageError}>{error}</div>}

      {cascadeCancelledForScreening.length > 0 && (
        <div className={s.cascadeAlert} role="status">
          <div className={s.cascadeAlertTitle}>連鎖キャンセルが発生しています</div>
          <p className={s.cascadeAlertText}>
            この上映回で {cascadeCancelledForScreening.length} 件のリクエストが連鎖キャンセルされました。
            {CASCADE_CANCELLED_NOTICE}
          </p>
        </div>
      )}

      {activeBooking && (
        <div className={s.panel}>
          <div className={s.panelHead}>
            <h3 className={s.panelTitle}>届いたリクエスト</h3>
            <p className={s.panelLead}>
              承諾する場合は、別の席を選んで予約を続けるか、この予約をキャンセルできます。拒否すると、依頼者の同じ上映回への他の承認待ちリクエストもすべてキャンセルされます。
            </p>
          </div>

          {incoming.length === 0 ? (
            <div className={s.receiveEmpty}>現在、承認待ちのリクエストはありません。</div>
          ) : (
            <div className={s.requestList}>
              {incoming.map((request) => {
                const targetSeatLabel = seatLabel(
                  request.targetBookingSeat.seat.rowLabel,
                  request.targetBookingSeat.seat.seatNumber,
                );

                return (
                  <div key={request.id} className={s.incomingCard}>
                    <div className={s.incomingCardHead}>
                      <span className={s.incomingBadge}>Seat Transfer</span>
                      <span className={`${s.status} ${s.status_pending}`}>承認待ち</span>
                    </div>
                    <p className={s.incomingText}>
                      お客様があなたの <strong>{targetSeatLabel}</strong> 席の譲渡（買い取り）を希望しています。
                    </p>
                    <div className={s.incomingReward}>
                      承諾時キャッシュバック: {formatYen(request.cashbackAmount)}
                    </div>

                    {respondingRequestId === request.id ? (
                      <div className={s.approvePanel}>
                        {approveStep === 'choose' && (
                          <>
                            <p className={s.approveLead}>承諾後の対応を選んでください。</p>
                            <div className={s.incomingActions}>
                              <button
                                type="button"
                                className={`${shared.btn} ${shared.btnSolid}`}
                                onClick={() => setApproveStep('pick-seat')}
                              >
                                別の席を選ぶ
                              </button>
                              <button
                                type="button"
                                className={shared.btn}
                                onClick={() => setApproveStep('confirm-cancel')}
                              >
                                予約をキャンセル
                              </button>
                              <button type="button" className={shared.btn} onClick={resetApproveFlow}>
                                戻る
                              </button>
                            </div>
                          </>
                        )}

                        {approveStep === 'pick-seat' && (
                          <>
                            <p className={s.approveLead}>移動先の席を選択してください。</p>
                            <div className={s.approverSeatGrid}>
                              {approverSelectableSeats.map((seat) => {
                                const label = seatLabel(seat.rowLabel, seat.seatNumber);
                                return (
                                  <button
                                    key={seat.id}
                                    type="button"
                                    className={`${s.approverSeatBtn}${
                                      pickedSeatId === seat.id ? ` ${s.approverSeatBtnActive}` : ''
                                    }`}
                                    onClick={() => setPickedSeatId(seat.id)}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                            <div className={s.incomingActions}>
                              <button
                                type="button"
                                className={`${shared.btn} ${shared.btnSolid}`}
                                disabled={!pickedSeatId || submitting}
                                onClick={() => pickedSeatId && respond(request.id, 'approve_reseat', pickedSeatId)}
                              >
                                この席で確定
                              </button>
                              <button
                                type="button"
                                className={shared.btn}
                                onClick={() => {
                                  setApproveStep('choose');
                                  setPickedSeatId(null);
                                }}
                              >
                                戻る
                              </button>
                            </div>
                          </>
                        )}

                        {approveStep === 'confirm-cancel' && (
                          <>
                            <p className={s.approveLead}>
                              この予約をキャンセルし、{targetSeatLabel} 席を相手に譲ります。よろしいですか？
                            </p>
                            <div className={s.incomingActions}>
                              <button
                                type="button"
                                className={`${shared.btn} ${shared.btnSolid}`}
                                disabled={submitting}
                                onClick={() => respond(request.id, 'approve_cancel')}
                              >
                                キャンセルして承諾
                              </button>
                              <button
                                type="button"
                                className={shared.btn}
                                onClick={() => setApproveStep('choose')}
                              >
                                戻る
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : decliningRequestId === request.id ? (
                      <div className={s.approvePanel}>
                        <p className={s.approveLead}>
                          このリクエストを拒否します。依頼者が同じ上映回に送っている他の承認待ちリクエストは、
                          <strong>連鎖的に自動キャンセル（連鎖キャンセル）</strong>されます。
                        </p>
                        <div className={s.incomingActions}>
                          <button
                            type="button"
                            className={`${shared.btn} ${shared.btnSolid}`}
                            disabled={submitting}
                            onClick={() => respond(request.id, 'decline')}
                          >
                            拒否を確定
                          </button>
                          <button type="button" className={shared.btn} onClick={resetApproveFlow}>
                            戻る
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={s.incomingActions}>
                        <button
                          type="button"
                          className={`${shared.btn} ${shared.btnSolid}`}
                          onClick={() => {
                            setRespondingRequestId(request.id);
                            setDecliningRequestId(null);
                            setApproveStep('choose');
                            setPickedSeatId(null);
                          }}
                        >
                          承諾する
                        </button>
                        <button
                          type="button"
                          className={shared.btn}
                          onClick={() => {
                            setDecliningRequestId(request.id);
                            setRespondingRequestId(null);
                            setApproveStep(null);
                            setPickedSeatId(null);
                          }}
                        >
                          拒否する
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
