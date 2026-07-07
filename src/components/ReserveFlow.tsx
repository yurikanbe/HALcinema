'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import BackButton from '@/components/BackButton';
import shared from '@/styles/shared.module.css';
import {
  TICKET_TYPES,
  MAX_SEATS_PER_BOOKING,
  SEAT_LAYOUTS,
  buildScreeningKey,
  buildSeatGrid,
  getOccupiedSeatIds,
  listReservableDates,
  calcSeatPrice,
  formatYen,
  buildReserveUrl,
  type ScreeningSelection,
  type ReserveShowOption,
  type SeatCell,
} from '@/lib/reserveData';
import type { TheaterId } from '@/lib/theaterConfig';
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
  const { data: session, status: sessionStatus } = useSession();

  const reservableDates = useMemo(() => listReservableDates(), []);
  const [selectedDate, setSelectedDate] = useState(
    initialParams?.date ?? reservableDates[0]?.date ?? '',
  );
  const [showOptions, setShowOptions] = useState<ReserveShowOption[]>([]);
  const [ticketTypes, setTicketTypes] = useState(TICKET_TYPES);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [step, setStep] = useState<Step>('show');
  const [selection, setSelection] = useState<ScreeningSelection | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [bookingNumber, setBookingNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seatMessage, setSeatMessage] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestFormError, setGuestFormError] = useState<string | null>(null);

  const hasRestoredFromParams = useRef(false);

  useEffect(() => {
    let ignore = false;
    const isInitialLoad = !hasRestoredFromParams.current;
    hasRestoredFromParams.current = true;

    // fetch中は一覧を空にしてローディング表示にする。DBに保存されない静的データを
    // 誤って選べてしまわないよう、API応答が届くまでは常に空のままにする。
    setShowOptions([]);

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
          // 取得に失敗した場合は空のままにする（誤予約防止のため静的データは表示しない）。
          setShowOptions([]);
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
  }, [initialParams, selectedDate]);

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
  const seatFees = selectedSeats.reduce(
    (sum, item) => sum + calcSeatPriceFromList(item.ticketTypeId, item.seat.isPremium),
    0,
  );
  const totalAmount = seatFees;
  const canProceed = selectedSeats.length > 0;

  const toggleSeat = (seat: SeatCell) => {
    if (occupied.has(seat.id)) {
      setSeatMessage('この席はすでに確保されています。別の席をお選びください。');
      return;
    }

    const exists = selectedSeats.find((item) => item.seat.id === seat.id);
    if (exists) {
      setSelectedSeats((prev) => prev.filter((item) => item.seat.id !== seat.id));
      setSeatMessage(null);
      return;
    }

    if (selectedSeats.length >= MAX_SEATS_PER_BOOKING) return;

    setSelectedSeats((prev) => [...prev, { seat, ticketTypeId: ticketTypes[0]?.id ?? 'general' }]);
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

  const handleComplete = async () => {
    if (!selection || isSubmitting) return;

    if (!selection.screeningId) {
      setSeatMessage('座席情報を取得できませんでした。上映回を選び直してください。');
      setStep('show');
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

    const isLoggedIn = sessionStatus === 'authenticated' && !!session?.user;
    if (!isLoggedIn) {
      if (!guestName.trim() || !guestEmail.trim()) {
        setGuestFormError('ご予約者様のお名前とメールアドレスを入力してください。');
        return;
      }
    }
    setGuestFormError(null);

    setIsSubmitting(true);
    try {
      const bookingRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screeningId: selection.screeningId,
          seats: apiSeats,
          // ログイン中はサーバーがセッションからuserId/bookingTypeを決定するため省略する。
          // 未ログイン時のみゲスト情報を送る。
          ...(isLoggedIn ? {} : { guestName: guestName.trim(), guestEmail: guestEmail.trim() }),
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

      const num = paymentData.booking.bookingNumber;
      setBookingNumber(num);
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
      {step !== 'complete' && (
        <div className={s.backRow}>
          <BackButton className={s.backBtn} />
        </div>
      )}

      {step !== 'complete' && (
        <div className={s.stepper}>
          {STEPS.map((item, index) => {
            const stepIndex = STEPS.findIndex((st) => st.id === step);
            const currentIndex = STEPS.findIndex((st) => st.id === item.id);
            const isActive = step === item.id;
            const isDone = currentIndex < stepIndex;

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
      )}

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
          {isLoadingOptions ? (
            <div className={s.loadingBlock}>
              <span className={s.spinner} aria-hidden="true" />
              <span>上映回を読み込んでいます…</span>
            </div>
          ) : showOptions.length === 0 ? (
            <div className={s.emptyBlock}>選択可能な上映回がありません。日付を変更してお試しください。</div>
          ) : (
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
          )}
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
              空席を選ぶと予約確定時に座席を確保します。確定処理中に他のお客様が先に確保した場合は、別の席を選び直してください。
            </p>
          </div>

          <div className={s.legend}>
            <span className={`${s.legendItem} ${s.legendAvailable}`}>選択可</span>
            <span className={`${s.legendItem} ${s.legendSelected}`}>選択中</span>
            <span className={`${s.legendItem} ${s.legendTaken}`}>売り切れ</span>
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
                        const classes = [
                          s.seat,
                          isTaken ? s.seatTaken : '',
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
                            disabled={isTaken}
                            onClick={() => toggleSeat(seat)}
                            aria-label={`${seat.row}列 ${seat.number}番${isTaken ? ' 売り切れ' : ''}${seat.isPremium ? ' プレミアム席' : ''}`}
                            aria-pressed={isSelected}
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

          <div className={s.selectionInfo}>
            選択中: <strong>{selectedSeats.length}</strong> / {MAX_SEATS_PER_BOOKING} 席
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
            <p className={s.panelLead}>座席ごとに券種をお選びください。</p>
          </div>

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
            <p className={s.panelLead}>予約内容を確認し、mock決済で座席を確定します。</p>
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

          {sessionStatus !== 'authenticated' && (
            <div className={s.confirmCard}>
              <div className={s.panelHead}>
                <h3 className={s.panelTitle} style={{ fontSize: 16 }}>ご予約者様情報</h3>
              </div>
              {guestFormError && <div className={s.seatMessage}>{guestFormError}</div>}
              <label className={s.guestField}>
                <span>お名前</span>
                <input
                  className={s.guestInput}
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                />
              </label>
              <label className={s.guestField}>
                <span>メールアドレス</span>
                <input
                  className={s.guestInput}
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  required
                />
              </label>
            </div>
          )}

          <div className={s.confirmSeats}>
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
          </div>

          <div className={s.totalBar}>
            <span>お支払い合計</span>
            <strong>{formatYen(totalAmount)}</strong>
          </div>

          <div className={s.prototypeNote}>
            現在の決済はモックです。予約確定時にDBへ予約・座席ロック・決済レコードを保存します。
          </div>

          <div className={s.actions}>
            <button type="button" className={shared.btn} onClick={() => setStep('tickets')}>
              券種に戻る
            </button>
            <button
              type="button"
              className={`${shared.btn} ${shared.btnSolid} ${s.submitBtn}`}
              disabled={isSubmitting}
              onClick={handleComplete}
            >
              {isSubmitting && <span className={s.spinner} aria-hidden="true" />}
              {isSubmitting ? '予約処理中' : '予約を確定する'}
            </button>
          </div>
        </div>
      )}

      {step === 'complete' && selection && (
        <div className={s.completeWrap}>
          <div className={s.completeStatusHeader}>
            <div className={s.completeStatusIcon}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0a1633" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className={s.completeStatusLabel}>予約が完了しました</div>
          </div>

          <div className={s.completeTicket}>
            <div className={s.completeTicketHeader}>
              <div className={s.completeTicketEyebrow}>HAL CINEMA</div>
              <div className={s.completeTicketMovie}>{selection.movieTitle}</div>
              <div className={s.completeTicketTheater}>
                {selection.theaterName} / {selection.conceptName}
              </div>
            </div>

            <div className={s.completeTicketPerforation}>
              <div className={s.completeTicketNotchLeft} />
              <div className={s.completeTicketNotchRight} />
            </div>

            <div className={s.completeTicketDetails}>
              <div>
                <div className={s.completeTicketLabel}>日付</div>
                <div className={s.completeTicketValue}>{selection.dateLabel}</div>
              </div>
              <div>
                <div className={s.completeTicketLabel}>時間</div>
                <div className={s.completeTicketValue}>{selection.time}</div>
              </div>
              <div>
                <div className={s.completeTicketLabel}>座席</div>
                <div className={s.completeTicketValue}>
                  {selectedSeats.map((item) => item.seat.id).join(' ')}
                </div>
              </div>
              <div>
                <div className={s.completeTicketLabel}>スクリーン</div>
                <div className={s.completeTicketValue}>{selection.screen}</div>
              </div>
            </div>

            <div className={s.completeStatusArea}>
              <div className={s.completeRef}>{bookingNumber}</div>
              <div className={s.completeRefLabel}>予約番号</div>
            </div>
          </div>

          <p className={s.completeNote}>
            電子チケットはマイページの予約履歴からいつでもご確認いただけます。
          </p>

          <div className={s.completeActions}>
            {sessionStatus === 'authenticated' && (
              <Link href="/mypage/history" className={`${shared.btn} ${shared.btnSolid} ${s.btnWide}`}>
                予約履歴を見る
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
