'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';
import shared from '@/styles/shared.module.css';
import {
  TICKET_TYPES,
  MAX_SEATS_PER_BOOKING,
  SEAT_LAYOUTS,
  buildScreeningKey,
  buildSeatGrid,
  getOccupiedSeatIds,
  listAvailableShows,
  listReservableDates,
  findShowFromParams,
  calcSeatPrice,
  formatYen,
  buildReserveUrl,
  type ScreeningSelection,
  type ReserveShowOption,
  type SeatCell,
} from '@/lib/reserveData';
import type { TheaterId } from '@/lib/theaterConfig';
import {
  SEAT_MOVE_CASHBACK,
  SEAT_MOVE_FEE,
  findOccupantBySeat,
  getOtherOccupants,
} from '@/lib/seatMoveData';
import {
  createBookingId,
  createBookingSeatId,
  createSeatMoveRequestId,
  saveBooking,
  saveSeatMoveRequest,
  type StoredBooking,
} from '@/lib/seatMoveStorage';
import s from './ReserveFlow.module.css';

type Step = 'show' | 'seats' | 'tickets' | 'confirm' | 'complete';

interface ReserveFlowProps {
  initialParams?: {
    movieId?: string;
    theater?: string;
    screen?: string;
    time?: string;
    date?: string;
    format?: string;
  };
}

interface SelectedSeat {
  seat: SeatCell;
  ticketTypeId: string;
}

interface PendingSeatMove {
  id: string;
  targetSeatId: string;
  requesterSeatId?: string;
}

interface BookingApiResponse {
  booking?: {
    id: string;
    bookingNumber: string;
  };
  error?: string;
}

const STEPS: { id: Step; label: string }[] = [
  { id: 'show', label: '上映回' },
  { id: 'seats', label: '座席' },
  { id: 'tickets', label: '券種' },
  { id: 'confirm', label: '確認' },
];

const THEATER_THEME: Record<TheaterId, string> = {
  starry: s.themeStarry,
  abyss: s.themeAbyss,
  cyber: s.themeCyber,
};

export default function ReserveFlow({ initialParams }: ReserveFlowProps) {
  const router = useRouter();
  const initialShow = useMemo(() => findShowFromParams(initialParams ?? {}), [initialParams]);
  const fallbackShowOptions = useMemo(() => {
    const options = listAvailableShows();
    if (initialParams?.movieId) {
      return options.filter((option) => option.movieId === initialParams.movieId);
    }
    return options;
  }, [initialParams?.movieId]);

  const reservableDates = useMemo(() => listReservableDates(), []);
  const [selectedDate, setSelectedDate] = useState(
    initialParams?.date ?? reservableDates[0]?.date ?? '',
  );
  const [showOptions, setShowOptions] = useState(fallbackShowOptions);
  const [ticketTypes, setTicketTypes] = useState(TICKET_TYPES);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [step, setStep] = useState<Step>(initialShow ? 'seats' : 'show');
  const [selection, setSelection] = useState<ScreeningSelection | null>(initialShow);
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [bookingNumber, setBookingNumber] = useState('');
  const [savedBookingId, setSavedBookingId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingMoves, setPendingMoves] = useState<PendingSeatMove[]>([]);
  const [moveTargetSeatId, setMoveTargetSeatId] = useState<string | null>(null);
  const [offerSeatId, setOfferSeatId] = useState<string>('');
  const [seatMessage, setSeatMessage] = useState<string | null>(null);

  const hasRestoredFromParams = useRef(false);

  useEffect(() => {
    let ignore = false;
    const isInitialLoad = !hasRestoredFromParams.current;
    hasRestoredFromParams.current = true;

    // API由来ではない（isApiBackedを持たない）選択肢をユーザーが誤ってクリックできない
    // ように、fetch中は一覧を空にしてローディング表示にする。初回ロード時のみ、API応答前の
    // 表示が空白にならないよう静的フォールバックを暫定表示する。
    if (isInitialLoad) {
      setShowOptions(fallbackShowOptions);
    } else {
      setShowOptions([]);
    }

    async function loadApiOptions() {
      setIsLoadingOptions(true);
      try {
        const q = new URLSearchParams();
        if (initialParams?.movieId) q.set('movieId', initialParams.movieId);
        if (selectedDate) q.set('date', selectedDate);
        const res = await fetch(`/api/screenings${q.toString() ? `?${q}` : ''}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to load screenings');
        const data = (await res.json()) as { screenings?: ReserveShowOption[] };
        const apiOptions = data.screenings ?? [];
        if (ignore) return;
        if (apiOptions.length === 0) {
          setShowOptions([]);
          return;
        }

        setShowOptions(apiOptions);
        setTicketTypes(apiOptions[0].ticketTypes ?? TICKET_TYPES);

        // 上映回の選択状態はURLから一度だけ復元する。決済完了後などにinitialParamsの
        // 参照が変わっても、進行中のstep/selectionを巻き戻さないようにするため。
        if (
          isInitialLoad &&
          initialParams?.movieId &&
          initialParams?.theater &&
          initialParams?.screen &&
          initialParams?.time
        ) {
          const matched = apiOptions.find(
            (option) =>
              option.movieId === initialParams.movieId &&
              option.theaterId === initialParams.theater &&
              option.time === initialParams.time &&
              option.format === initialParams.format,
          );
          if (matched) {
            setSelection(matched);
            setStep('seats');
          }
        }
      } catch {
        if (!ignore) {
          // 静的フォールバックはisApiBackedを持たずDBに保存されないプロトタイプ用の
          // データなので、初回ロード失敗時のみ表示する。日付タブ切り替え後の失敗では
          // 空のまま（誤予約防止）にする。
          setShowOptions(isInitialLoad ? fallbackShowOptions : []);
          setTicketTypes(TICKET_TYPES);
        }
      } finally {
        if (!ignore) setIsLoadingOptions(false);
      }
    }

    loadApiOptions();
    return () => {
      ignore = true;
    };
  }, [fallbackShowOptions, initialParams, selectedDate]);

  const layout = selection ? SEAT_LAYOUTS[selection.theaterId] : null;
  const screeningKey = selection ? buildScreeningKey(selection) : '';
  const occupied = useMemo(
    () => {
      if (selection?.seats) {
        return new Set(
          selection.seats
            .filter((seat) => seat.status && seat.status !== 'AVAILABLE')
            .map((seat) => seat.id),
        );
      }
      return layout ? getOccupiedSeatIds(screeningKey, layout) : new Set<string>();
    },
    [layout, screeningKey, selection],
  );
  const seatGrid = selection?.seats ?? (layout ? buildSeatGrid(layout) : []);
  const ownSeatIds = selectedSeats.map((item) => item.seat.id);
  const requestableTakenSeatIds = useMemo(() => {
    const ids = new Set<string>();
    if (selection?.isApiBacked) return ids;
    for (const takenId of occupied) {
      if (ownSeatIds.includes(takenId)) continue;
      if (pendingMoves.some((move) => move.targetSeatId === takenId)) continue;
      ids.add(takenId);
    }
    return ids;
  }, [occupied, ownSeatIds, pendingMoves, selection?.isApiBacked]);

  const moveTargetSeat = moveTargetSeatId
    ? seatGrid.find((seat) => seat.id === moveTargetSeatId) ?? null
    : null;

  const exchangeFees = pendingMoves.length * SEAT_MOVE_FEE;
  const seatFees = selectedSeats.reduce(
    (sum, item) => sum + calcSeatPriceFromList(item.ticketTypeId, item.seat.isPremium),
    0,
  );
  const totalAmount = seatFees + exchangeFees;
  const canProceed = selectedSeats.length > 0 || pendingMoves.length > 0;

  const toggleSeat = (seat: SeatCell) => {
    if (occupied.has(seat.id)) {
      if (requestableTakenSeatIds.has(seat.id)) {
        handleTakenSeatClick(seat);
      } else {
        setSeatMessage('この席はすでに確保されています。別の席をお選びください。');
      }
      return;
    }

    const exists = selectedSeats.find((item) => item.seat.id === seat.id);
    if (exists) {
      setSelectedSeats((prev) => prev.filter((item) => item.seat.id !== seat.id));
      setPendingMoves((prev) => prev.filter((move) => move.requesterSeatId !== seat.id));
      setMoveTargetSeatId(null);
      setSeatMessage(null);
      return;
    }

    if (selectedSeats.length >= MAX_SEATS_PER_BOOKING) return;

    setSelectedSeats((prev) => [...prev, { seat, ticketTypeId: ticketTypes[0]?.id ?? 'general' }]);
    setSeatMessage(null);
  };

  const handleTakenSeatClick = (seat: SeatCell) => {
    if (!occupied.has(seat.id)) return;

    if (pendingMoves.some((move) => move.targetSeatId === seat.id)) {
      setSeatMessage('この席にはすでにリクエストを追加済みです。');
      return;
    }

    setMoveTargetSeatId(seat.id);
    setOfferSeatId('');
    setSeatMessage(null);
  };

  const confirmSeatMoveRequest = () => {
    if (!moveTargetSeat) return;

    setPendingMoves((prev) => [
      ...prev,
      {
        id: createSeatMoveRequestId(),
        targetSeatId: moveTargetSeat.id,
        requesterSeatId: offerSeatId || undefined,
      },
    ]);
    setMoveTargetSeatId(null);
    setOfferSeatId('');
    setSeatMessage(
      `${moveTargetSeat.id} 席への席交換リクエストを追加しました（${formatYen(SEAT_MOVE_FEE)}）。`,
    );
  };

  const removePendingMove = (id: string) => {
    setPendingMoves((prev) => prev.filter((move) => move.id !== id));
    setSeatMessage(null);
  };

  const updateTicketType = (seatId: string, ticketTypeId: string) => {
    setSelectedSeats((prev) =>
      prev.map((item) => (item.seat.id === seatId ? { ...item, ticketTypeId } : item)),
    );
  };

  function calcSeatPriceFromList(ticketTypeId: string, isPremium: boolean): number {
    const ticket = ticketTypes.find((t) => t.id === ticketTypeId) ?? TICKET_TYPES.find((t) => t.id === ticketTypeId);
    if (!ticket) return calcSeatPrice(ticketTypeId, isPremium);
    return ticket.basePrice + (isPremium ? 500 : 0);
  }

  const savePrototypeBooking = () => {
    if (!selection) return;

    const num = `HAL-${Date.now().toString(36).toUpperCase().slice(-8)}`;
    const bookingId = createBookingId();
    const booking: StoredBooking = {
      id: bookingId,
      bookingNumber: num,
      screeningKey: buildScreeningKey(selection),
      selection,
      seats: selectedSeats.map((item) => ({
        id: createBookingSeatId(),
        seatId: item.seat.id,
        ticketTypeId: item.ticketTypeId,
        unitPrice: calcSeatPriceFromList(item.ticketTypeId, item.seat.isPremium),
      })),
      totalAmount,
      createdAt: new Date().toISOString(),
    };

    saveBooking(booking);

    for (const move of pendingMoves) {
      const requesterSeat = move.requesterSeatId
        ? booking.seats.find((item) => item.seatId === move.requesterSeatId)
        : undefined;
      const occupant = findOccupantBySeat(
        getOtherOccupants(booking.screeningKey, SEAT_LAYOUTS[selection.theaterId], ownSeatIds),
        move.targetSeatId,
      );
      if (!occupant) continue;

      saveSeatMoveRequest({
        id: move.id,
        requesterBookingId: bookingId,
        requesterBookingSeatId: requesterSeat?.id ?? null,
        targetBookingSeatId: occupant.bookingSeatId,
        targetBookingId: occupant.bookingId,
        screeningKey: booking.screeningKey,
        requesterSeatId: move.requesterSeatId ?? null,
        targetSeatId: move.targetSeatId,
        fee: SEAT_MOVE_FEE,
        cashbackAmount: SEAT_MOVE_CASHBACK,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      });
    }

    setBookingNumber(num);
    setSavedBookingId(bookingId);
    setStep('complete');
  };

  const handleComplete = async () => {
    if (!selection || isSubmitting) return;

    if (!selection.isApiBacked || !selection.screeningId) {
      savePrototypeBooking();
      return;
    }

    const apiSeats = selectedSeats
      .filter((item) => item.seat.dbId)
      .map((item) => ({
        seatId: item.seat.dbId!,
        ticketTypeId: item.ticketTypeId,
      }));

    if (apiSeats.length !== selectedSeats.length) {
      setSeatMessage('座席情報を取得できませんでした。上映回を選び直してください。');
      setStep('seats');
      return;
    }

    setIsSubmitting(true);
    try {
      const bookingRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screeningId: selection.screeningId,
          bookingType: 'GUEST',
          guestName: 'デモ予約',
          guestEmail: 'demo@example.com',
          seats: apiSeats,
        }),
      });
      const bookingData = (await bookingRes.json()) as BookingApiResponse;
      if (!bookingRes.ok || !bookingData.booking) {
        throw new Error(bookingData.error ?? '予約の作成に失敗しました。');
      }

      const paymentRes = await fetch(`/api/bookings/${bookingData.booking.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'CREDIT_CARD', provider: 'mock' }),
      });
      const paymentData = (await paymentRes.json()) as BookingApiResponse;
      if (!paymentRes.ok || !paymentData.booking) {
        throw new Error(paymentData.error ?? '決済確定に失敗しました。');
      }

      const bookingId = paymentData.booking.id;
      const num = paymentData.booking.bookingNumber;
      setBookingNumber(num);
      setSavedBookingId(bookingId);

      const storedBooking: StoredBooking = {
        id: bookingId,
        bookingNumber: num,
        screeningKey: selection.screeningId,
        selection,
        seats: selectedSeats.map((item) => ({
          id: item.seat.dbId ?? createBookingSeatId(),
          seatId: item.seat.id,
          ticketTypeId: item.ticketTypeId,
          unitPrice: calcSeatPriceFromList(item.ticketTypeId, item.seat.isPremium),
        })),
        totalAmount,
        createdAt: new Date().toISOString(),
      };
      saveBooking(storedBooking);
      setStep('complete');
    } catch (error) {
      setSeatMessage(error instanceof Error ? error.message : '予約処理に失敗しました。');
      setStep('seats');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToStep = (next: Step) => {
    if (next === 'seats' && !selection) return;
    if ((next === 'tickets' || next === 'confirm') && !canProceed) return;
    setStep(next);
  };

  const themeClass = selection ? THEATER_THEME[selection.theaterId] : '';

  return (
    <div className={s.flow}>
      <div className={s.backRow}>
        <BackButton className={s.backBtn} />
      </div>

      <div className={s.stepper}>
        {STEPS.map((item, index) => {
          const stepIndex = STEPS.findIndex((st) => st.id === step);
          const currentIndex = STEPS.findIndex((st) => st.id === item.id);
          const isActive = step === item.id || (step === 'complete' && item.id === 'confirm');
          const isDone = step === 'complete' || currentIndex < stepIndex;

          return (
            <div key={item.id} className={s.stepperItem}>
              <div
                className={`${s.stepperDot}${isActive ? ` ${s.stepperDotActive}` : ''}${isDone ? ` ${s.stepperDotDone}` : ''}`}
              >
                {index + 1}
              </div>
              <span className={`${s.stepperLabel}${isActive ? ` ${s.stepperLabelActive}` : ''}`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {step === 'show' && (
        <div className={s.panel}>
          <div className={s.panelHead}>
            <div className={shared.sectionHint}>Step 1</div>
            <h2 className={s.panelTitle}>上映回を選択</h2>
            <p className={s.panelLead}>
              {isLoadingOptions
                ? '予約可能な上映回を読み込んでいます。'
                : '日付と上映回をお選びください。'}
            </p>
          </div>
          <div className={s.dateTabs}>
            {reservableDates.map((option) => (
              <button
                key={option.date}
                type="button"
                className={`${s.dateTab}${selectedDate === option.date ? ` ${s.dateTabActive}` : ''}`}
                onClick={() => setSelectedDate(option.date)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className={s.showList}>
            {showOptions.map((option) => (
              <button
                key={option.screeningKey}
                type="button"
                className={`${s.showCard} ${THEATER_THEME[option.theaterId]}`}
                onClick={() => {
                  setSelection(option);
                  setTicketTypes(option.ticketTypes ?? TICKET_TYPES);
                  setSelectedSeats([]);
                  setPendingMoves([]);
                  setMoveTargetSeatId(null);
                  setSeatMessage(null);
                  router.replace(buildReserveUrl(option));
                  setStep('seats');
                }}
              >
                <div className={s.showCardTop}>
                  <span className={s.showCardTime}>{option.time}</span>
                  <span className={s.showCardFormat}>{option.format}</span>
                </div>
                <div className={s.showCardTitle}>{option.movieTitle}</div>
                <div className={s.showCardMeta}>
                  <span>{option.conceptName}</span>
                  <span>{option.screen}</span>
                  <span>残席 {option.remainingSeats ?? '—'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'seats' && selection && layout && (
        <div className={`${s.panel} ${themeClass}`}>
          <div className={s.summaryBar}>
            <div>
              <div className={s.summaryEyebrow}>{selection.dateLabel}</div>
              <div className={s.summaryTitle}>{selection.movieTitle}</div>
              <div className={s.summaryMeta}>
                {selection.conceptName} · {selection.screen} · {selection.time} 開始 · {selection.format}
              </div>
            </div>
            {selection.poster && (
              <div className={s.summaryPoster} style={{ backgroundImage: `url('${selection.poster}')` }} />
            )}
          </div>

          <div className={s.panelHead}>
            <div className={shared.sectionHint}>Step 2</div>
            <h2 className={s.panelTitle}>座席を選択</h2>
            <p className={s.panelLead}>
              {selection.isApiBacked
                ? '空席を選ぶと予約確定時に座席を確保します。確定処理中に他のお客様が先に確保した場合は、別の席を選び直してください。'
                : `空席を選ぶか、売り切れの席に ${formatYen(SEAT_MOVE_FEE)} で席交換リクエストを送れます。席がなくてもリクエストのみで進められます。`}
            </p>
          </div>

          <div className={s.legend}>
            <span className={`${s.legendItem} ${s.legendAvailable}`}>選択可</span>
            <span className={`${s.legendItem} ${s.legendSelected}`}>選択中</span>
            <span className={`${s.legendItem} ${s.legendTaken}`}>売り切れ</span>
            <span className={`${s.legendItem} ${s.legendMove}`}>席交換可</span>
            <span className={`${s.legendItem} ${s.legendPremium}`}>プレミアム</span>
            <span className={`${s.legendItem} ${s.legendAccessible}`}>車椅子</span>
          </div>

          {seatMessage && <div className={s.seatMessage}>{seatMessage}</div>}

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
                        const isTaken = occupied.has(seat.id);
                        const isSelected = selectedSeats.some((item) => item.seat.id === seat.id);
                        const isRequestable = isTaken && requestableTakenSeatIds.has(seat.id);
                        const isMoveTarget = moveTargetSeatId === seat.id;
                        const hasPendingMove = pendingMoves.some((move) => move.targetSeatId === seat.id);
                        const classes = [
                          s.seat,
                          isTaken ? s.seatTaken : '',
                          isRequestable ? s.seatMoveable : '',
                          isMoveTarget ? s.seatMoveTarget : '',
                          hasPendingMove ? s.seatMovePending : '',
                          isSelected ? s.seatSelected : '',
                          seat.isPremium ? s.seatPremium : '',
                          seat.isAccessible ? s.seatAccessible : '',
                        ]
                          .filter(Boolean)
                          .join(' ');

                        return (
                          <button
                            key={seat.id}
                            type="button"
                            className={classes}
                            disabled={isTaken && !isRequestable && !hasPendingMove}
                            onClick={() => toggleSeat(seat)}
                            aria-label={`${seat.row}列 ${seat.number}番${
                              isTaken
                                ? isRequestable
                                  ? ' 売り切れ・席交換リクエスト可'
                                  : ' 売り切れ'
                                : ''
                            }${seat.isPremium ? ' プレミアム席' : ''}`}
                            aria-pressed={isSelected || isMoveTarget}
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

          {moveTargetSeat && !selection.isApiBacked && (
            <div className={s.seatMovePanel}>
              <div className={s.seatMovePanelTitle}>席交換リクエスト</div>
              <p className={s.seatMovePanelText}>
                <strong>{moveTargetSeat.id}</strong> 席の先約者に、席の交換をリクエストします。承諾された場合、
                {moveTargetSeat.id} 席でご鑑賞いただけます。
              </p>
              {selectedSeats.length > 0 && (
                <label className={s.offerSeatField}>
                  <span>提供する席（任意）</span>
                  <select
                    className={s.offerSeatSelect}
                    value={offerSeatId}
                    onChange={(e) => setOfferSeatId(e.target.value)}
                  >
                    <option value="">提供しない（希望席のみ）</option>
                    {selectedSeats.map((item) => (
                      <option key={item.seat.id} value={item.seat.id}>
                        {item.seat.id}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className={s.seatMovePanelFees}>
                <span>リクエスト料金: {formatYen(SEAT_MOVE_FEE)}</span>
                <span>相手へのキャッシュバック: {formatYen(SEAT_MOVE_CASHBACK)}</span>
              </div>
              <div className={s.seatMovePanelActions}>
                <button type="button" className={shared.btn} onClick={() => setMoveTargetSeatId(null)}>
                  キャンセル
                </button>
                <button
                  type="button"
                  className={`${shared.btn} ${shared.btnSolid}`}
                  onClick={confirmSeatMoveRequest}
                >
                  リクエストを追加
                </button>
              </div>
            </div>
          )}

          {pendingMoves.length > 0 && !selection.isApiBacked && (
            <div className={s.pendingMoveList}>
              <div className={s.pendingMoveTitle}>送信予定の席交換リクエスト</div>
              {pendingMoves.map((move) => (
                <div key={move.id} className={s.pendingMoveRow}>
                  <span>
                    {move.requesterSeatId
                      ? `${move.requesterSeatId} ↔ ${move.targetSeatId}`
                      : `${move.targetSeatId} 席を希望`}
                    （{formatYen(SEAT_MOVE_FEE)}）
                  </span>
                  <button type="button" className={s.pendingMoveRemove} onClick={() => removePendingMove(move.id)}>
                    取消
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={s.selectionInfo}>
            選択中: <strong>{selectedSeats.length}</strong> / {MAX_SEATS_PER_BOOKING} 席
            {pendingMoves.length > 0 && (
              <span className={s.selectionSeats}>
                席交換リクエスト: {pendingMoves.length} 件
              </span>
            )}
            {selectedSeats.length > 0 && (
              <span className={s.selectionSeats}>
                {selectedSeats.map((item) => item.seat.id).join(' · ')}
              </span>
            )}
          </div>

          <div className={s.actions}>
            <button type="button" className={shared.btn} onClick={() => setStep('show')}>
              上映回を変更
            </button>
            <button
              type="button"
              className={`${shared.btn} ${shared.btnSolid}`}
              disabled={!canProceed}
              onClick={() => goToStep('tickets')}
            >
              券種選択へ
            </button>
          </div>
        </div>
      )}

      {step === 'tickets' && selection && (
        <div className={`${s.panel} ${themeClass}`}>
          <div className={s.panelHead}>
            <div className={shared.sectionHint}>Step 3</div>
            <h2 className={s.panelTitle}>券種を選択</h2>
            <p className={s.panelLead}>
              {selectedSeats.length > 0
                ? '座席ごとに券種をお選びください。'
                : selection.isApiBacked
                  ? '座席を選んでから券種を指定してください。'
                  : '席交換リクエストのみの予約です。承認後に席が確定します。'}
            </p>
          </div>

          {selectedSeats.length > 0 ? (
            <div className={s.ticketList}>
              {selectedSeats.map((item) => (
              <div key={item.seat.id} className={s.ticketRow}>
                <div className={s.ticketRowSeat}>
                  <span className={s.ticketRowLabel}>座席</span>
                  <strong>
                    {item.seat.id}
                    {item.seat.isPremium ? '（プレミアム）' : ''}
                  </strong>
                </div>
                <select
                  className={s.ticketSelect}
                  value={item.ticketTypeId}
                  onChange={(e) => updateTicketType(item.seat.id, e.target.value)}
                >
                  {ticketTypes.map((ticket) => (
                    <option key={ticket.id} value={ticket.id}>
                      {ticket.nameJa} — {formatYen(calcSeatPriceFromList(ticket.id, item.seat.isPremium))}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            </div>
          ) : (
            <div className={s.exchangeOnlyNote}>
              送信予定の席交換リクエスト: {pendingMoves.length} 件（{formatYen(exchangeFees)}）
            </div>
          )}

          {pendingMoves.length > 0 && selectedSeats.length > 0 && (
            <div className={s.exchangeOnlyNote}>
              席交換リクエスト料金: {formatYen(exchangeFees)}
            </div>
          )}

          <div className={s.totalBar}>
            <span>合計（税込）</span>
            <strong>{formatYen(totalAmount)}</strong>
          </div>

          <div className={s.actions}>
            <button type="button" className={shared.btn} onClick={() => setStep('seats')}>
              座席に戻る
            </button>
            <button
              type="button"
              className={`${shared.btn} ${shared.btnSolid}`}
              onClick={() => goToStep('confirm')}
            >
              内容を確認
            </button>
          </div>
        </div>
      )}

      {step === 'confirm' && selection && (
        <div className={`${s.panel} ${themeClass}`}>
          <div className={s.panelHead}>
            <div className={shared.sectionHint}>Step 4</div>
            <h2 className={s.panelTitle}>予約内容の確認</h2>
            <p className={s.panelLead}>
              {selection.isApiBacked
                ? '予約内容を確認し、mock決済で座席を確定します。'
                : 'プロトタイプのため、決済は行われません。'}
            </p>
          </div>

          <div className={s.confirmCard}>
            <div className={s.confirmRow}>
              <span>作品</span>
              <strong>{selection.movieTitle}</strong>
            </div>
            <div className={s.confirmRow}>
              <span>日時</span>
              <strong>
                {selection.dateLabel} {selection.time}〜
              </strong>
            </div>
            <div className={s.confirmRow}>
              <span>スクリーン</span>
              <strong>
                {selection.conceptName} / {selection.screen}
              </strong>
            </div>
            <div className={s.confirmRow}>
              <span>形式</span>
              <strong>{selection.format}</strong>
            </div>
          </div>

          <div className={s.confirmSeats}>
            {selectedSeats.length === 0 && pendingMoves.length > 0 && (
              <div className={s.confirmSeatRow}>
                <span>席</span>
                <span>席交換リクエスト承認待ち</span>
                <strong>{formatYen(exchangeFees)}</strong>
              </div>
            )}
            {selectedSeats.map((item) => {
              const ticket = ticketTypes.find((t) => t.id === item.ticketTypeId) ?? TICKET_TYPES[0];
              const price = calcSeatPriceFromList(item.ticketTypeId, item.seat.isPremium);
              return (
                <div key={item.seat.id} className={s.confirmSeatRow}>
                  <span>
                    {item.seat.id}
                    {item.seat.isPremium ? ' · プレミアム' : ''}
                  </span>
                  <span>{ticket.nameJa}</span>
                  <strong>{formatYen(price)}</strong>
                </div>
              );
            })}
            {pendingMoves.map((move) => (
              <div key={move.id} className={s.confirmSeatRow}>
                <span>席交換</span>
                <span>
                  {move.requesterSeatId
                    ? `${move.requesterSeatId} ↔ ${move.targetSeatId}`
                    : `${move.targetSeatId} 席を希望`}
                </span>
                <strong>{formatYen(SEAT_MOVE_FEE)}</strong>
              </div>
            ))}
          </div>

          <div className={s.totalBar}>
            <span>お支払い合計</span>
            <strong>{formatYen(totalAmount)}</strong>
          </div>

          <div className={s.prototypeNote}>
            {selection.isApiBacked
              ? '現在の決済はモックです。予約確定時にDBへ予約・座席ロック・決済レコードを保存します。'
              : '本画面は座席予約機能のプロトタイプです。予約確定後も実際のチケット発行・決済は行われません。'}
          </div>

          <div className={s.actions}>
            <button type="button" className={shared.btn} onClick={() => setStep('tickets')}>
              券種に戻る
            </button>
            <button
              type="button"
              className={`${shared.btn} ${shared.btnSolid}`}
              disabled={isSubmitting}
              onClick={handleComplete}
            >
              {isSubmitting ? '予約処理中' : selection.isApiBacked ? '予約を確定する' : '予約を確定する（デモ）'}
            </button>
          </div>
        </div>
      )}

      {step === 'complete' && selection && (
        <div className={`${s.completePanel} ${themeClass}`}>
          <div className={s.completeGlow} />
          <div className={s.completeBody}>
            <div className={s.completeLabel}>Reservation Complete</div>
            <h2 className={s.completeTitle}>予約が完了しました</h2>
            <p className={s.completeDesc}>
              {selection.isApiBacked
                ? '予約情報をDBに保存し、mock決済で座席を確定しました。'
                : 'プロトタイプのデモ予約です。予約番号は画面表示のみで、実際の発券は行われません。'}
            </p>
            <div className={s.bookingNumber}>{bookingNumber}</div>
            <div className={s.completeSummary}>
              <div>{selection.movieTitle}</div>
              <div>
                {selection.dateLabel} {selection.time} / {selection.conceptName} {selection.screen}
              </div>
              <div>
                {selectedSeats.length > 0
                  ? selectedSeats.map((item) => item.seat.id).join(' · ')
                  : '席交換リクエスト承認待ち'}
              </div>
              {pendingMoves.length > 0 && (
                <div className={s.completePendingMoves}>
                  席交換リクエスト:{' '}
                  {pendingMoves
                    .map((move) =>
                      move.requesterSeatId
                        ? `${move.requesterSeatId}↔${move.targetSeatId}`
                        : `${move.targetSeatId}希望`,
                    )
                    .join(' · ')}
                </div>
              )}
              <div className={s.completeTotal}>{formatYen(totalAmount)}</div>
            </div>

            {pendingMoves.length > 0 && (
              <div className={s.seatMovePromo}>
                <div className={s.seatMovePromoLabel}>Seat Exchange</div>
                <p className={s.seatMovePromoText}>
                  {pendingMoves.length} 件の席交換リクエストを送信しました。1件でも拒否されると他のリクエストは自動キャンセルされます。
                </p>
                <Link
                  href={`/reserve/seat-move?bookingId=${savedBookingId}`}
                  className={`${shared.btn} ${shared.btnSolid}`}
                >
                  リクエスト状況を確認
                </Link>
              </div>
            )}

            {pendingMoves.length === 0 && !selection.isApiBacked && (
              <div className={s.seatMovePromo}>
                <div className={s.seatMovePromoLabel}>Seat Exchange</div>
                <p className={s.seatMovePromoText}>
                  売り切れの席を希望する場合は、席交換リクエスト（+{formatYen(100)}）をご利用ください。
                </p>
                <Link
                  href={`/reserve/seat-move?bookingId=${savedBookingId}`}
                  className={`${shared.btn} ${shared.btnSolid}`}
                >
                  席交換リクエストへ
                </Link>
              </div>
            )}

            <div className={s.actionsCenter}>
              <Link href="/schedule" className={shared.btn}>
                上映スケジュールへ
              </Link>
              <Link href="/movies" className={shared.btn}>
                作品一覧へ
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
