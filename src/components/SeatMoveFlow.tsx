'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import shared from '@/styles/shared.module.css';
import { formatYen } from '@/lib/reserveData';
import type { BookingView, SeatMoveRequestView } from '@/lib/api/bookingTypes';
import s from './SeatMoveFlow.module.css';

const SEAT_MOVE_FEE = 100;
const SEAT_MOVE_CASHBACK = 100;

type Tab = 'send' | 'receive';
type ApproveStep = 'choose' | 'pick-seat' | 'confirm-cancel';

const STATUS_LABEL: Record<SeatMoveRequestView['status'], string> = {
  PENDING: '承認待ち',
  APPROVED: '承認済み',
  DECLINED: '拒否',
  EXPIRED: '期限切れ',
  CANCELLED: 'キャンセル',
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
  const [tab, setTab] = useState<Tab>('send');
  const [activeBookingId, setActiveBookingId] = useState<string | null>(initialBookingId ?? bookings[0]?.id ?? null);
  const [seats, setSeats] = useState<ScreeningSeat[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [selectedTargetSeatId, setSelectedTargetSeatId] = useState<string | null>(null);
  const [offerSeatId, setOfferSeatId] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);
  const [approveStep, setApproveStep] = useState<ApproveStep | null>(null);
  const [pickedSeatId, setPickedSeatId] = useState<string | null>(null);

  const activeBooking = useMemo(
    () => bookings.find((item) => item.id === activeBookingId) ?? bookings[0] ?? null,
    [bookings, activeBookingId],
  );

  const resetApproveFlow = () => {
    setRespondingRequestId(null);
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

  // 同一上映回に自分の予約が複数ある場合、他の自分の予約の座席も「自分の席」として除外する
  // （API側は予約単位ではなくユーザー単位で所有権を判定するため、表示もそれに合わせる）
  const ownSeatIds = useMemo(() => {
    const screeningId = activeBooking?.screening.id;
    const seatIds = bookings
      .filter((booking) => booking.screening.id === screeningId)
      .flatMap((booking) => booking.bookingSeats.map((seat) => seatLabel(seat.seat.rowLabel, seat.seat.seatNumber)));
    return new Set(seatIds);
  }, [bookings, activeBooking]);

  const outgoing = activeBooking?.requestedSeatMoves ?? [];
  const incoming = activeBooking?.targetedSeatMoves?.filter((item) => item.status === 'PENDING') ?? [];
  const pendingTargetSeatIds = useMemo(
    () =>
      new Set(
        outgoing
          .filter((item) => item.status === 'PENDING')
          .map((item) => seatLabel(item.targetBookingSeat.seat.rowLabel, item.targetBookingSeat.seat.seatNumber)),
      ),
    [outgoing],
  );

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

  const handleSendRequest = async () => {
    if (!activeBooking || !selectedTargetSeatId) return;
    const targetSeat = seats.find((seat) => seatLabel(seat.rowLabel, seat.seatNumber) === selectedTargetSeatId);
    if (!targetSeat?.bookingSeatId) return;

    const offeredSeat = activeBooking.bookingSeats.find(
      (seat) => seatLabel(seat.seat.rowLabel, seat.seat.seatNumber) === offerSeatId,
    );

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/seat-moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterBookingId: activeBooking.id,
          requesterBookingSeatId: offeredSeat?.id ?? null,
          targetBookingSeatId: targetSeat.bookingSeatId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'リクエストの送信に失敗しました。');

      setMessage(`${selectedTargetSeatId} 席のお客様へ席交換リクエストを送信しました（${formatYen(SEAT_MOVE_FEE)}）。`);
      setSelectedTargetSeatId(null);
      setOfferSeatId('');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'リクエストの送信に失敗しました。');
    } finally {
      setSubmitting(false);
    }
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
          <div className={shared.sectionHint}>Seat Exchange</div>
          <h2 className={s.emptyTitle}>対象の予約が見つかりません</h2>
          <p className={s.emptyLead}>
            席交換リクエストは、決済完了済みで上映開始前の予約に対してのみご利用いただけます。
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
        <div className={shared.sectionHint}>Seat Exchange</div>
        <h2 className={s.introTitle}>席交換リクエスト</h2>
        <p className={s.introLead}>
          先約のある席を希望する場合、{formatYen(SEAT_MOVE_FEE)} で席の交換をリクエストできます。承諾された方には
          {formatYen(SEAT_MOVE_CASHBACK)} のキャッシュバックがあります。拒否が1件でもあると、同じ上映回への他のリクエストはすべて自動キャンセルされます。
        </p>
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
            setSelectedTargetSeatId(null);
            setOfferSeatId('');
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

      <div className={s.tabs}>
        <button
          type="button"
          className={`${s.tabBtn}${tab === 'send' ? ` ${s.tabBtnActive}` : ''}`}
          onClick={() => {
            setTab('send');
            resetApproveFlow();
          }}
        >
          リクエストを送る
        </button>
        <button
          type="button"
          className={`${s.tabBtn}${tab === 'receive' ? ` ${s.tabBtnActive}` : ''}`}
          onClick={() => {
            setTab('receive');
            setSelectedTargetSeatId(null);
          }}
        >
          届いたリクエスト
          {incoming.length > 0 && <span className={s.tabBadge}>{incoming.length}</span>}
        </button>
      </div>

      {message && <div className={s.message}>{message}</div>}
      {error && <div className={s.message}>{error}</div>}

      {tab === 'send' && activeBooking && (
        <div className={s.panel}>
          <div className={s.panelHead}>
            <h3 className={s.panelTitle}>希望する席を選ぶ</h3>
            <p className={s.panelLead}>
              売り切れの席をクリックして席交換をリクエストできます。ご自身の席はなくても送信可能です。
            </p>
          </div>

          {loadingSeats ? (
            <div className={s.receiveEmpty}>座席情報を読み込み中です…</div>
          ) : (
            <>
              <div className={s.legend}>
                <span className={`${s.legendItem} ${s.legendOwn}`}>あなたの席</span>
                <span className={`${s.legendItem} ${s.legendOther}`}>先約あり</span>
                <span className={`${s.legendItem} ${s.legendTarget}`}>リクエスト先</span>
              </div>

              <div className={s.screenStage}>
                <div className={s.screenLabel}>SCREEN</div>
              </div>

              <div className={s.seatMapWrap}>
                <div className={s.seatMap}>
                  {Array.from(new Set(seats.map((seat) => seat.rowLabel))).map((row) => (
                    <div key={row} className={s.seatRow}>
                      <span className={s.rowLabel}>{row}</span>
                      <div className={s.seatRowSeats}>
                        {seats
                          .filter((seat) => seat.rowLabel === row)
                          .map((seat) => {
                            const label = seatLabel(seat.rowLabel, seat.seatNumber);
                            const isOwn = ownSeatIds.has(label);
                            const isOtherOccupied =
                              seat.status !== 'AVAILABLE' && !isOwn && seat.bookingId !== null;
                            const isRequestable = isOtherOccupied && !pendingTargetSeatIds.has(label);
                            const isSelectedTarget = selectedTargetSeatId === label;

                            const classes = [
                              s.seat,
                              isOwn ? s.seatOwn : '',
                              isOtherOccupied ? s.seatOther : '',
                              isRequestable ? s.seatMoveable : '',
                              isSelectedTarget ? s.seatSelectedTarget : '',
                              seat.status !== 'AVAILABLE' && !isOwn && !isRequestable ? s.seatTaken : '',
                            ]
                              .filter(Boolean)
                              .join(' ');

                            return (
                              <button
                                key={seat.id}
                                type="button"
                                className={classes}
                                disabled={!isOwn && !isRequestable}
                                onClick={() => {
                                  if (isRequestable) {
                                    setSelectedTargetSeatId(label);
                                    setMessage(null);
                                    setError(null);
                                  }
                                }}
                                aria-label={`${seat.rowLabel}列 ${seat.seatNumber}番`}
                              >
                                {seat.seatNumber}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedTargetSeatId && (
                <div className={s.requestConfirm}>
                  <div className={s.requestConfirmTitle}>席交換リクエスト</div>
                  <p>
                    <strong>{selectedTargetSeatId}</strong> 席の先約者に、席の交換をリクエストします。
                  </p>
                  {activeBooking.bookingSeats.length > 0 && (
                    <label className={s.offerSeatField}>
                      <span>提供する席（任意・1席のみ）</span>
                      <select
                        className={s.offerSeatSelect}
                        value={offerSeatId}
                        onChange={(e) => setOfferSeatId(e.target.value)}
                      >
                        <option value="">提供しない（希望席のみ）</option>
                        {activeBooking.bookingSeats.map((seat) => {
                          const label = seatLabel(seat.seat.rowLabel, seat.seat.seatNumber);
                          return (
                            <option key={seat.id} value={label}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                  )}
                  <div className={s.requestConfirmFees}>
                    <span>リクエスト料金: {formatYen(SEAT_MOVE_FEE)}</span>
                    <span>相手へのキャッシュバック: {formatYen(SEAT_MOVE_CASHBACK)}</span>
                  </div>
                  <div className={s.requestConfirmActions}>
                    <button type="button" className={shared.btn} onClick={() => setSelectedTargetSeatId(null)}>
                      キャンセル
                    </button>
                    <button
                      type="button"
                      className={`${shared.btn} ${shared.btnSolid}`}
                      disabled={submitting}
                      onClick={handleSendRequest}
                    >
                      リクエストを送信
                    </button>
                  </div>
                </div>
              )}

              {outgoing.length > 0 && (
                <div className={s.requestList}>
                  <h4 className={s.requestListTitle}>送信済みリクエスト</h4>
                  {outgoing.map((request) => (
                    <div key={request.id} className={s.requestCard}>
                      <div>
                        {request.requesterBookingSeat
                          ? `${seatLabel(request.requesterBookingSeat.seat.rowLabel, request.requesterBookingSeat.seat.seatNumber)} ↔ `
                          : ''}
                        {seatLabel(request.targetBookingSeat.seat.rowLabel, request.targetBookingSeat.seat.seatNumber)}
                      </div>
                      <div className={s.requestCardMeta}>
                        <span className={`${s.status} ${s[`status_${request.status.toLowerCase()}`]}`}>
                          {STATUS_LABEL[request.status]}
                        </span>
                        <span>{formatYen(request.fee)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'receive' && activeBooking && (
        <div className={s.panel}>
          <div className={s.panelHead}>
            <h3 className={s.panelTitle}>届いたリクエスト</h3>
            <p className={s.panelLead}>
              承諾する場合は、別の席を選んで予約を続けるか、この予約をキャンセルできます。
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
                const offeredSeatLabel = request.requesterBookingSeat
                  ? seatLabel(request.requesterBookingSeat.seat.rowLabel, request.requesterBookingSeat.seat.seatNumber)
                  : null;

                return (
                  <div key={request.id} className={s.incomingCard}>
                    <div className={s.incomingCardHead}>
                      <span className={s.incomingBadge}>Seat Exchange</span>
                      <span className={`${s.status} ${s.status_pending}`}>承認待ち</span>
                    </div>
                    <p className={s.incomingText}>
                      お客様があなたの <strong>{targetSeatLabel}</strong> 席を希望しています。
                      {offeredSeatLabel ? `（提供席: ${offeredSeatLabel}）` : '（提供席なし）'}
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
                    ) : (
                      <div className={s.incomingActions}>
                        <button
                          type="button"
                          className={`${shared.btn} ${shared.btnSolid}`}
                          onClick={() => {
                            setRespondingRequestId(request.id);
                            setApproveStep('choose');
                            setPickedSeatId(null);
                          }}
                        >
                          承諾する
                        </button>
                        <button
                          type="button"
                          className={shared.btn}
                          disabled={submitting}
                          onClick={() => respond(request.id, 'decline')}
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
