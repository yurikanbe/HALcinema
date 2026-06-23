'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import shared from '@/styles/shared.module.css';
import { buildSeatGrid, formatYen, getOccupiedSeatIds } from '@/lib/reserveData';
import {
  SEAT_MOVE_CASHBACK,
  SEAT_MOVE_FEE,
  applyExchangeApproval,
  applyExchangeDecline,
  ensureDemoIncomingRequest,
  findOccupantBySeat,
  formatRequestLabel,
  getLayoutForTheater,
  getOtherOccupants,
  getSelectableSeatsForApprover,
} from '@/lib/seatMoveData';
import {
  createSeatMoveRequestId,
  getBookings as loadBookings,
  getIncomingRequests,
  getOutgoingRequests,
  getSeatMoveRequests,
  saveSeatMoveRequest,
  type SeatMoveRequest,
} from '@/lib/seatMoveStorage';
import type { TheaterId } from '@/lib/theaterConfig';
import s from './SeatMoveFlow.module.css';

type Tab = 'send' | 'receive';
type ApproveStep = 'choose' | 'pick-seat' | 'confirm-cancel';

const THEATER_THEME: Record<TheaterId, string> = {
  starry: s.themeStarry,
  abyss: s.themeAbyss,
  cyber: s.themeCyber,
};

const STATUS_LABEL: Record<SeatMoveRequest['status'], string> = {
  pending: '承認待ち',
  approved: '承認済み',
  declined: '拒否',
  expired: '期限切れ',
  cancelled: 'キャンセル',
};

interface SeatMoveFlowProps {
  initialBookingId?: string;
}

export default function SeatMoveFlow({ initialBookingId }: SeatMoveFlowProps) {
  const [tab, setTab] = useState<Tab>('send');
  const [bookings, setBookings] = useState(loadBookings());
  const [requests, setRequests] = useState(getSeatMoveRequests());
  const [activeBookingId, setActiveBookingId] = useState<string | null>(initialBookingId ?? null);
  const [selectedTargetSeatId, setSelectedTargetSeatId] = useState<string | null>(null);
  const [offerSeatId, setOfferSeatId] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);
  const [approveStep, setApproveStep] = useState<ApproveStep | null>(null);
  const [pickedSeatId, setPickedSeatId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setBookings(loadBookings());
    setRequests(getSeatMoveRequests());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (initialBookingId) setActiveBookingId(initialBookingId);
  }, [initialBookingId]);

  const activeBooking = useMemo(
    () => bookings.find((item) => item.id === activeBookingId) ?? bookings[0] ?? null,
    [bookings, activeBookingId],
  );

  useEffect(() => {
    if (!activeBooking) return;
    ensureDemoIncomingRequest(activeBooking);
    refresh();
  }, [activeBooking, refresh]);

  const layout = activeBooking ? getLayoutForTheater(activeBooking.selection.theaterId) : null;
  const seatGrid = layout ? buildSeatGrid(layout) : [];
  const ownSeatIds = activeBooking?.seats.map((item) => item.seatId) ?? [];
  const occupied = useMemo(
    () =>
      activeBooking && layout
        ? getOccupiedSeatIds(activeBooking.screeningKey, layout)
        : new Set<string>(),
    [activeBooking, layout],
  );
  const occupants = useMemo(
    () =>
      activeBooking && layout
        ? getOtherOccupants(activeBooking.screeningKey, layout, ownSeatIds)
        : [],
    [activeBooking, layout, ownSeatIds],
  );

  const requestableTakenIds = useMemo(() => {
    const ids = new Set<string>();
    const pendingTargets = new Set(
      requests
        .filter(
          (item) =>
            item.status === 'pending' && item.requesterBookingId === activeBooking?.id,
        )
        .map((item) => item.targetSeatId),
    );

    for (const seatId of occupied) {
      if (ownSeatIds.includes(seatId)) continue;
      if (pendingTargets.has(seatId)) continue;
      ids.add(seatId);
    }
    return ids;
  }, [occupied, ownSeatIds, requests, activeBooking]);

  const outgoing = activeBooking ? getOutgoingRequests(activeBooking.id) : [];
  const incoming = activeBooking ? getIncomingRequests(activeBooking.id) : [];
  const respondingRequest = respondingRequestId
    ? requests.find((item) => item.id === respondingRequestId) ?? null
    : null;

  const approverSelectableSeats = useMemo(() => {
    if (!respondingRequest || !layout || !activeBooking) return [];
    return getSelectableSeatsForApprover(
      activeBooking.screeningKey,
      layout,
      respondingRequest,
      ownSeatIds,
    );
  }, [respondingRequest, layout, activeBooking, ownSeatIds]);

  const resetApproveFlow = () => {
    setRespondingRequestId(null);
    setApproveStep(null);
    setPickedSeatId(null);
  };

  const handleSendRequest = () => {
    if (!activeBooking || !selectedTargetSeatId) return;

    const occupant = findOccupantBySeat(occupants, selectedTargetSeatId);
    if (!occupant) return;

    const offeredSeat = activeBooking.seats.find((item) => item.seatId === offerSeatId);
    const duplicate = requests.some(
      (item) =>
        item.status === 'pending' &&
        item.requesterBookingId === activeBooking.id &&
        item.targetSeatId === selectedTargetSeatId,
    );
    if (duplicate) {
      setMessage('この席にはすでにリクエストを送信済みです。');
      return;
    }

    saveSeatMoveRequest({
      id: createSeatMoveRequestId(),
      requesterBookingId: activeBooking.id,
      requesterBookingSeatId: offeredSeat?.id ?? null,
      targetBookingSeatId: occupant.bookingSeatId,
      targetBookingId: occupant.bookingId,
      screeningKey: activeBooking.screeningKey,
      requesterSeatId: offeredSeat?.seatId ?? null,
      targetSeatId: selectedTargetSeatId,
      fee: SEAT_MOVE_FEE,
      cashbackAmount: SEAT_MOVE_CASHBACK,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    });

    refresh();
    setSelectedTargetSeatId(null);
    setOfferSeatId('');
    setMessage(
      `${selectedTargetSeatId} 席のお客様へ席交換リクエストを送信しました（${formatYen(SEAT_MOVE_FEE)}）。`,
    );
  };

  const handleDecline = (requestId: string) => {
    applyExchangeDecline(requestId);
    resetApproveFlow();
    setMessage('リクエストを拒否しました。同一予約の他の承認待ちリクエストもキャンセルされました。');
    refresh();
  };

  const handleApproveConfirm = () => {
    if (!respondingRequest || !layout) return;

    if (approveStep === 'confirm-cancel') {
      applyExchangeApproval(respondingRequest.id, { type: 'cancel' }, layout);
      setMessage(
        `リクエストを承認し、予約をキャンセルしました。${formatYen(SEAT_MOVE_CASHBACK)} のキャッシュバックが付与されます（デモ）。`,
      );
    } else if (approveStep === 'pick-seat' && pickedSeatId) {
      applyExchangeApproval(
        respondingRequest.id,
        { type: 'reseat', newSeatId: pickedSeatId },
        layout,
      );
      setMessage(
        `リクエストを承認し、${pickedSeatId} 席に変更しました。${formatYen(SEAT_MOVE_CASHBACK)} のキャッシュバックが付与されます（デモ）。`,
      );
    } else {
      return;
    }

    resetApproveFlow();
    refresh();
  };

  if (bookings.length === 0) {
    return (
      <div className={s.flow}>
        <div className={s.backRow}>
          <BackButton className={s.backBtn} />
        </div>
        <div className={s.emptyPanel}>
          <div className={shared.sectionHint}>Seat Exchange</div>
          <h2 className={s.emptyTitle}>予約が見つかりません</h2>
          <p className={s.emptyLead}>
            席交換リクエストは予約と同時、または予約完了後にご利用いただけます。まず上映回を予約してください。
          </p>
          <Link href="/reserve" className={`${shared.btn} ${shared.btnSolid}`}>
            オンライン予約へ
          </Link>
        </div>
      </div>
    );
  }

  const themeClass = activeBooking ? THEATER_THEME[activeBooking.selection.theaterId] : '';

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
          {formatYen(SEAT_MOVE_CASHBACK)} のキャッシュバックがあります。拒否が1件でもあると、同じ予約の他リクエストはすべて自動キャンセルされます。
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
            resetApproveFlow();
          }}
        >
          {bookings.map((booking) => (
            <option key={booking.id} value={booking.id}>
              {booking.bookingNumber} · {booking.selection.movieTitle} ·{' '}
              {booking.seats.length > 0
                ? booking.seats.map((seat) => seat.seatId).join(', ')
                : '席交換リクエストのみ'}
            </option>
          ))}
        </select>
      </div>

      {activeBooking && (
        <div className={`${s.summaryBar} ${themeClass}`}>
          <div>
            <div className={s.summaryEyebrow}>{activeBooking.selection.dateLabel}</div>
            <div className={s.summaryTitle}>{activeBooking.selection.movieTitle}</div>
            <div className={s.summaryMeta}>
              {activeBooking.selection.conceptName} · {activeBooking.selection.screen} ·{' '}
              {activeBooking.selection.time} 開始
            </div>
            <div className={s.summarySeats}>
              あなたの席:{' '}
              {activeBooking.seats.length > 0
                ? activeBooking.seats.map((seat) => seat.seatId).join(' · ')
                : '未確定（席交換リクエスト承認待ち）'}
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

      {tab === 'send' && activeBooking && layout && (
        <div className={`${s.panel} ${themeClass}`}>
          <div className={s.panelHead}>
            <h3 className={s.panelTitle}>希望する席を選ぶ</h3>
            <p className={s.panelLead}>
              売り切れの席をクリックして席交換をリクエストできます。ご自身の席はなくても送信可能です。
            </p>
          </div>

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
              {layout.rows.map((row) => (
                <div key={row} className={s.seatRow}>
                  <span className={s.rowLabel}>{row}</span>
                  <div className={s.seatRowSeats}>
                    {seatGrid
                      .filter((seat) => seat.row === row)
                      .map((seat) => {
                        const isOwn = ownSeatIds.includes(seat.id);
                        const isOther = occupants.some((item) => item.seatId === seat.id);
                        const isRequestable = requestableTakenIds.has(seat.id);
                        const isSelectedTarget = selectedTargetSeatId === seat.id;

                        const classes = [
                          s.seat,
                          isOwn ? s.seatOwn : '',
                          isOther ? s.seatOther : '',
                          isRequestable ? s.seatMoveable : '',
                          isSelectedTarget ? s.seatSelectedTarget : '',
                          occupied.has(seat.id) && !isOwn && !isRequestable ? s.seatTaken : '',
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
                                setSelectedTargetSeatId(seat.id);
                                setMessage(null);
                              }
                            }}
                            aria-label={`${seat.row}列 ${seat.number}番`}
                          >
                            {seat.number}
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
              {activeBooking.seats.length > 0 && (
                <label className={s.offerSeatField}>
                  <span>提供する席（任意・1席のみ）</span>
                  <select
                    className={s.offerSeatSelect}
                    value={offerSeatId}
                    onChange={(e) => setOfferSeatId(e.target.value)}
                  >
                    <option value="">提供しない（希望席のみ）</option>
                    {activeBooking.seats.map((seat) => (
                      <option key={seat.id} value={seat.seatId}>
                        {seat.seatId}
                      </option>
                    ))}
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
                  <div>{formatRequestLabel(request)}</div>
                  <div className={s.requestCardMeta}>
                    <span className={`${s.status} ${s[`status_${request.status}`]}`}>
                      {STATUS_LABEL[request.status]}
                    </span>
                    <span>{formatYen(request.fee)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'receive' && activeBooking && (
        <div className={`${s.panel} ${themeClass}`}>
          <div className={s.panelHead}>
            <h3 className={s.panelTitle}>届いたリクエスト</h3>
            <p className={s.panelLead}>
              承諾する場合は、別の席を選んで予約を続けるか、この日の予約をキャンセルできます。
            </p>
          </div>

          {incoming.length === 0 ? (
            <div className={s.receiveEmpty}>現在、承認待ちのリクエストはありません。</div>
          ) : (
            <div className={s.requestList}>
              {incoming.map((request) => (
                <div key={request.id} className={s.incomingCard}>
                  <div className={s.incomingCardHead}>
                    <span className={s.incomingBadge}>Seat Exchange</span>
                    <span className={`${s.status} ${s.status_pending}`}>承認待ち</span>
                  </div>
                  <p className={s.incomingText}>
                    お客様があなたの <strong>{request.targetSeatId}</strong> 席を希望しています。
                    {request.requesterSeatId
                      ? `（提供席: ${request.requesterSeatId}）`
                      : '（提供席なし）'}
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

                      {approveStep === 'pick-seat' && layout && (
                        <>
                          <p className={s.approveLead}>移動先の席を選択してください。</p>
                          <div className={s.approverSeatGrid}>
                            {approverSelectableSeats.map((seat) => (
                              <button
                                key={seat.id}
                                type="button"
                                className={`${s.approverSeatBtn}${
                                  pickedSeatId === seat.id ? ` ${s.approverSeatBtnActive}` : ''
                                }`}
                                onClick={() => setPickedSeatId(seat.id)}
                              >
                                {seat.id}
                              </button>
                            ))}
                          </div>
                          <div className={s.incomingActions}>
                            <button
                              type="button"
                              className={`${shared.btn} ${shared.btnSolid}`}
                              disabled={!pickedSeatId}
                              onClick={handleApproveConfirm}
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
                            この日の予約をキャンセルし、{request.targetSeatId}{' '}
                            席を相手に譲ります。よろしいですか？
                          </p>
                          <div className={s.incomingActions}>
                            <button
                              type="button"
                              className={`${shared.btn} ${shared.btnSolid}`}
                              onClick={handleApproveConfirm}
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
                        onClick={() => handleDecline(request.id)}
                      >
                        拒否する
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={s.prototypeNote}>
        本機能は <code>seat_move_requests</code> テーブルに基づくプロトタイプです。データはブラウザの
        localStorage に保存され、実際の決済・通知は行われません。
      </div>
    </div>
  );
}
