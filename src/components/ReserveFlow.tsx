'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type Step = 'show' | 'seats' | 'tickets' | 'buyoutNotice' | 'confirm' | 'complete';

interface BuyoutRequest {
  seatId: string;
  requestId: string;
  targetBookingSeatId: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
  seatLabel: string;
}

interface ApiBuyoutRequest {
  id: string;
  status: BuyoutRequest['status'];
  seatLabel: string;
  targetBookingSeatId: string;
}

function normalizeBuyoutRequest(item: ApiBuyoutRequest): BuyoutRequest {
  return {
    requestId: item.id,
    seatId: item.seatLabel,
    seatLabel: item.seatLabel,
    targetBookingSeatId: item.targetBookingSeatId,
    status: item.status,
  };
}

interface ScreeningSeatDetail {
  id: string;
  rowLabel: string;
  seatNumber: number;
  isPremium: boolean;
  isAccessible: boolean;
  status: 'AVAILABLE' | 'HELD' | 'CONFIRMED';
  bookingSeatId: string | null;
  bookingId: string | null;
}

interface ApprovedBookingSeat {
  seatLabel: string;
  unitPrice: number;
  ticketTypeName: string;
}

const SEAT_MOVE_FEE = 100;

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

function parseScreeningStart(selection: ScreeningSelection): Date {
  const [hours, minutes = 0] = selection.time.split(':').map(Number);
  const start = new Date(`${selection.date}T00:00:00+09:00`);
  start.setHours(hours, minutes, 0, 0);
  return start;
}

function formatMinutesRemaining(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}時間${m}分` : `${h}時間`;
  }
  return `${Math.max(1, Math.round(minutes))}分`;
}

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
  /** 座席譲渡リクエスト（PENDING / APPROVED） */
  const [buyoutRequests, setBuyoutRequests] = useState<BuyoutRequest[]>([]);
  const [approvedBookingSeats, setApprovedBookingSeats] = useState<ApprovedBookingSeat[]>([]);
  const [screeningSeats, setScreeningSeats] = useState<ScreeningSeatDetail[]>([]);
  const [loadingScreeningSeats, setLoadingScreeningSeats] = useState(false);
  const [buyoutTargetSeatId, setBuyoutTargetSeatId] = useState<string | null>(null);
  const [isSendingBuyout, setIsSendingBuyout] = useState(false);
  /** 他ユーザーが PENDING の譲渡リクエストを送っている席 */
  const [blockedBuyoutSeatIds, setBlockedBuyoutSeatIds] = useState<Set<string>>(new Set());
  /** 承認待ち譲渡席の券種（seatId → ticketTypeId） */
  const [buyoutTicketTypes, setBuyoutTicketTypes] = useState<Record<string, string>>({});

  const hasRestoredFromParams = useRef(false);

  const steps = useMemo(() => {
    const list: { id: Step; label: string }[] = [
      { id: 'show', label: '上映回' },
      { id: 'seats', label: '座席' },
      { id: 'tickets', label: '券種' },
    ];
    if (buyoutRequests.length > 0) {
      list.push({ id: 'buyoutNotice', label: '譲渡確認' });
    }
    list.push({ id: 'confirm', label: '確認' });
    return list;
  }, [buyoutRequests.length]);

  const screeningUrgency = useMemo(() => {
    if (!selection) return null;
    const minutesUntil = (parseScreeningStart(selection).getTime() - Date.now()) / 60000;
    if (minutesUntil <= 0) return { kind: 'started' as const };
    if (minutesUntil <= 30) return { kind: 'cutoff' as const, minutesUntil };
    if (minutesUntil <= 60) return { kind: 'unlikely' as const, minutesUntil };
    return { kind: 'normal' as const, minutesUntil };
  }, [selection]);

  const stepNumber = steps.findIndex((item) => item.id === step) + 1;

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

  const refreshBuyoutRequests = useCallback(async (screeningId: string) => {
    try {
      const res = await fetch(`/api/seat-moves?screeningId=${screeningId}`, { cache: 'no-store' });
      const data = (await res.json()) as {
        requests?: ApiBuyoutRequest[];
        blockedSeatLabels?: string[];
        pendingBooking?: {
          bookingSeats: ApprovedBookingSeat[];
        } | null;
        error?: string;
      };
      if (!res.ok) return;
      const active = (data.requests ?? [])
        .filter((item) => item.status === 'PENDING' || item.status === 'APPROVED')
        .map(normalizeBuyoutRequest);
      setBuyoutRequests(active);
      setBlockedBuyoutSeatIds(new Set(data.blockedSeatLabels ?? []));
      setApprovedBookingSeats(data.pendingBooking?.bookingSeats ?? []);
      setBuyoutTicketTypes((prev) => {
        const next = { ...prev };
        const defaultTicketId = ticketTypes[0]?.id ?? 'general';
        for (const req of active.filter((item) => item.status === 'PENDING')) {
          if (!next[req.seatId]) next[req.seatId] = defaultTicketId;
        }
        return next;
      });
    } catch {
      /* ignore */
    }
  }, [ticketTypes]);

  useEffect(() => {
    if (!selection?.screeningId || sessionStatus !== 'authenticated') {
      setBuyoutRequests([]);
      setApprovedBookingSeats([]);
      setBlockedBuyoutSeatIds(new Set());
      return;
    }
    refreshBuyoutRequests(selection.screeningId);
    if (step !== 'confirm' && step !== 'buyoutNotice') return;

    const timer = window.setInterval(() => {
      refreshBuyoutRequests(selection.screeningId!);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [selection?.screeningId, sessionStatus, step, refreshBuyoutRequests]);

  useEffect(() => {
    if (!selection?.screeningId || step !== 'seats') return;
    let ignore = false;

    async function loadSeats() {
      setLoadingScreeningSeats(true);
      try {
        const res = await fetch(`/api/screenings/${selection!.screeningId}/seats`, { cache: 'no-store' });
        const data = (await res.json()) as { seats?: ScreeningSeatDetail[] };
        if (!ignore) setScreeningSeats(data.seats ?? []);
      } catch {
        if (!ignore) setScreeningSeats([]);
      } finally {
        if (!ignore) setLoadingScreeningSeats(false);
      }
    }

    loadSeats();
    return () => {
      ignore = true;
    };
  }, [selection?.screeningId, step]);

  const seatDetailsByLabel = useMemo(() => {
    const map = new Map<string, ScreeningSeatDetail>();
    for (const seat of screeningSeats) {
      map.set(`${seat.rowLabel}${seat.seatNumber}`, seat);
    }
    return map;
  }, [screeningSeats]);

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
  const activeBuyouts = buyoutRequests.filter(
    (item) => item.status === 'PENDING' || item.status === 'APPROVED',
  );
  const seatFees = selectedSeats.reduce(
    (sum, item) => sum + calcSeatPriceFromList(item.ticketTypeId, item.seat.isPremium),
    0,
  );
  const approvedSeatFees = approvedBookingSeats.reduce((sum, item) => sum + item.unitPrice, 0);
  const buyoutFeeTotal = activeBuyouts.length * SEAT_MOVE_FEE;

  const getBuyoutSeatPremium = (seatLabel: string): boolean => {
    const detail = seatDetailsByLabel.get(seatLabel);
    if (detail) return detail.isPremium;
    return seatGrid.find((seat) => seat.id === seatLabel)?.isPremium ?? false;
  };

  const pendingBuyoutTicketFees = activeBuyouts
    .filter((item) => item.status === 'PENDING')
    .reduce((sum, req) => {
      const ticketTypeId = buyoutTicketTypes[req.seatId] ?? ticketTypes[0]?.id ?? 'general';
      return sum + calcSeatPriceFromList(ticketTypeId, getBuyoutSeatPremium(req.seatLabel));
    }, 0);

  const totalAmount = seatFees + approvedSeatFees + buyoutFeeTotal + pendingBuyoutTicketFees;
  const canProceed = selectedSeats.length > 0 || activeBuyouts.length > 0;
  const canPay = canProceed;

  const pendingBuyoutCount = activeBuyouts.filter((item) => item.status === 'PENDING').length;
  const approvedBuyoutCount = activeBuyouts.filter((item) => item.status === 'APPROVED').length;

  const pendingBuyoutSeatIds = useMemo(
    () => new Set(activeBuyouts.filter((item) => item.status === 'PENDING').map((item) => item.seatId)),
    [activeBuyouts],
  );

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

  const handleSeatClick = (seat: SeatCell) => {
    const detail = seatDetailsByLabel.get(seat.id);
    const isConfirmed = detail?.status === 'CONFIRMED' && detail.bookingSeatId;
    const isHeld = detail?.status === 'HELD';

    if (isConfirmed) {
      if (sessionStatus !== 'authenticated') {
        setSeatMessage('座席譲渡リクエストはログインが必要です。別の空席をお選びください。');
        return;
      }
      if (pendingBuyoutSeatIds.has(seat.id)) {
        setBuyoutTargetSeatId(null);
        setSeatMessage(`座席 ${seat.id} への譲渡リクエストは送信済みです。`);
        return;
      }
      if (blockedBuyoutSeatIds.has(seat.id)) {
        setBuyoutTargetSeatId(null);
        setSeatMessage(`座席 ${seat.id} には他のお客様の譲渡リクエストが入っています。`);
        return;
      }
      if (screeningUrgency?.kind === 'cutoff') {
        setSeatMessage('上映30分前を過ぎているため、譲渡リクエストは送信できません。');
        return;
      }
      setBuyoutTargetSeatId(seat.id);
      setSeatMessage(null);
      return;
    }

    if (isHeld || occupied.has(seat.id)) {
      setSeatMessage('この席はすでに確保されています。別の席をお選びください。');
      return;
    }

    setBuyoutTargetSeatId(null);
    toggleSeat(seat);
  };

  const sendBuyoutRequest = async () => {
    if (!selection?.screeningId || !buyoutTargetSeatId || isSendingBuyout) return;
    if (pendingBuyoutSeatIds.has(buyoutTargetSeatId)) {
      setSeatMessage(`座席 ${buyoutTargetSeatId} への譲渡リクエストは送信済みです。`);
      setBuyoutTargetSeatId(null);
      return;
    }
    const detail = seatDetailsByLabel.get(buyoutTargetSeatId);
    if (!detail?.bookingSeatId) return;

    setIsSendingBuyout(true);
    setSeatMessage(null);
    try {
      const res = await fetch('/api/seat-moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screeningId: selection.screeningId,
          targetBookingSeatId: detail.bookingSeatId,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (res.status === 409) {
        await refreshBuyoutRequests(selection.screeningId);
        throw new Error(data.error ?? 'この席にはすでに譲渡リクエストが入っています。');
      }
      if (!res.ok) throw new Error(data.error ?? '譲渡リクエストの送信に失敗しました。');
      setBuyoutTargetSeatId(null);
      await refreshBuyoutRequests(selection.screeningId);
      setSeatMessage('譲渡リクエストを送信しました。先約者の承諾をお待ちください。');
    } catch (error) {
      setSeatMessage(error instanceof Error ? error.message : '譲渡リクエストの送信に失敗しました。');
    } finally {
      setIsSendingBuyout(false);
    }
  };

  const cancelBuyoutRequest = async (requestId: string) => {
    if (!selection?.screeningId || !requestId) {
      setSeatMessage('リクエストIDが取得できませんでした。ページを更新してください。');
      return;
    }
    try {
      const res = await fetch(`/api/seat-moves/${requestId}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? '取り消しに失敗しました。');
      await refreshBuyoutRequests(selection.screeningId);
    } catch (error) {
      setSeatMessage(error instanceof Error ? error.message : '取り消しに失敗しました。');
    }
  };

  const updateTicketType = (seatId: string, ticketTypeId: string) => {
    setSelectedSeats((prev) =>
      prev.map((item) => (item.seat.id === seatId ? { ...item, ticketTypeId } : item)),
    );
  };

  const updateBuyoutTicketType = (seatId: string, ticketTypeId: string) => {
    setBuyoutTicketTypes((prev) => ({ ...prev, [seatId]: ticketTypeId }));
  };

  function resolveTicketTypeDbId(ticketTypeId: string): string {
    const ticket = ticketTypes.find((t) => t.id === ticketTypeId);
    return ticket?.dbId ?? ticketTypeId;
  }

  function calcSeatPriceFromList(ticketTypeId: string, isPremium: boolean): number {
    const ticket = ticketTypes.find((t) => t.id === ticketTypeId) ?? TICKET_TYPES.find((t) => t.id === ticketTypeId);
    if (!ticket) return calcSeatPrice(ticketTypeId, isPremium);
    return ticket.basePrice + (isPremium ? 500 : 0);
  }

  const handleComplete = async () => {
    if (!selection || isSubmitting) return;

    if (!canPay) {
      setSeatMessage('決済できる内容がありません。座席を選択するか、譲渡リクエストを送信してください。');
      return;
    }

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

    if (selectedSeats.length > 0 && apiSeats.length !== selectedSeats.length) {
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
          seatMoveRequestIds: activeBuyouts
            .map((item) => item.requestId)
            .filter((id) => /^[1-9]\d*$/.test(id)),
          buyoutTickets: activeBuyouts
            .filter((item) => item.status === 'PENDING')
            .map((item) => ({
              requestId: item.requestId,
              ticketTypeId: resolveTicketTypeDbId(
                buyoutTicketTypes[item.seatId] ?? ticketTypes[0]?.id ?? 'general',
              ),
            })),
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
    if ((next === 'tickets' || next === 'buyoutNotice' || next === 'confirm') && !canProceed) return;
    if (next === 'buyoutNotice' && buyoutRequests.length === 0) {
      setStep('confirm');
      return;
    }
    setStep(next);
  };

  const goToConfirmStep = () => {
    if (buyoutRequests.length > 0) goToStep('buyoutNotice');
    else goToStep('confirm');
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
          {steps.map((item, index) => {
            const stepIndex = steps.findIndex((st) => st.id === step);
            const currentIndex = steps.findIndex((st) => st.id === item.id);
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
                    setBuyoutRequests([]);
                    setApprovedBookingSeats([]);
                    setBuyoutTargetSeatId(null);
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
              空席を選ぶと予約確定時に座席を確保します。先約済みの席（ログイン時）はクリックして
              <strong>座席譲渡リクエスト</strong>（¥{SEAT_MOVE_FEE}/件）を送れます。
            </p>
          </div>

          <div className={s.legend}>
            <span className={`${s.legendItem} ${s.legendAvailable}`}>選択可</span>
            <span className={`${s.legendItem} ${s.legendSelected}`}>選択中</span>
            <span className={`${s.legendItem} ${s.legendTaken}`}>先約あり</span>
            <span className={`${s.legendItem} ${s.legendMoveable}`}>譲渡可</span>
            <span className={`${s.legendItem} ${s.legendMovePending}`}>譲渡待ち</span>
            <span className={`${s.legendItem} ${s.legendPremium}`}>プレミアム</span>
            <span className={`${s.legendItem} ${s.legendAccessible}`}>車椅子</span>
          </div>

          {sessionStatus !== 'authenticated' && (
            <div className={s.exchangeOnlyNote}>
              座席譲渡リクエストは<strong>ログイン</strong>が必要です。ゲスト予約の場合は空席のみ選択できます。
            </div>
          )}

          {screeningUrgency?.kind === 'unlikely' && sessionStatus === 'authenticated' && (
            <div className={s.buyoutUrgencyWarn} role="alert">
              上映まで残り約 {formatMinutesRemaining(screeningUrgency.minutesUntil)} です。
              譲渡リクエストは承認されにくい可能性があります。
            </div>
          )}

          {loadingScreeningSeats && (
            <div className={s.seatMessage}>座席の最新状況を読み込んでいます…</div>
          )}

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
                        const detail = seatDetailsByLabel.get(seat.id);
                        const isConfirmed = detail?.status === 'CONFIRMED' && detail.bookingSeatId;
                        const isHeld = detail?.status === 'HELD';
                        const isTaken = isHeld || (occupied.has(seat.id) && !isConfirmed);
                        const isSelected = selectedSeats.some((item) => item.seat.id === seat.id);
                        const isBuyoutPending = pendingBuyoutSeatIds.has(seat.id);
                        const isBuyoutBlocked = blockedBuyoutSeatIds.has(seat.id);
                        const isBuyoutable =
                          isConfirmed &&
                          sessionStatus === 'authenticated' &&
                          !isBuyoutPending &&
                          !isBuyoutBlocked &&
                          screeningUrgency?.kind !== 'cutoff';
                        const isBuyoutTarget = buyoutTargetSeatId === seat.id;

                        const classes = [
                          s.seat,
                          isTaken && !isBuyoutable && !isBuyoutPending ? s.seatTaken : '',
                          isSelected ? s.seatSelected : '',
                          isBuyoutable ? s.seatMoveable : '',
                          isBuyoutPending ? s.seatMovePending : '',
                          isBuyoutBlocked ? s.seatTaken : '',
                          isBuyoutTarget ? s.seatMoveTarget : '',
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
                            disabled={isTaken && !isBuyoutable && !isBuyoutPending}
                            onClick={() => handleSeatClick(seat)}
                            aria-label={`${seat.row}列 ${seat.number}番${isTaken ? ' 先約あり' : ''}${isBuyoutPending ? ' 譲渡待ち' : ''}${seat.isPremium ? ' プレミアム席' : ''}`}
                            aria-pressed={isSelected || isBuyoutTarget}
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

          {buyoutTargetSeatId && !pendingBuyoutSeatIds.has(buyoutTargetSeatId) && (
            <div className={s.seatMovePanel}>
              <div className={s.seatMovePanelTitle}>座席譲渡リクエスト</div>
              <p className={s.seatMovePanelText}>
                座席 <strong>{buyoutTargetSeatId}</strong> への譲渡を依頼します。席の交換ではなく
                <strong>買い取り（譲渡）</strong>です。拒否または承諾時に、同じ上映回の他の PENDING リクエストは
                <strong>連鎖キャンセル</strong>されます。
              </p>
              <div className={s.seatMovePanelFees}>
                <span>リクエスト料: {formatYen(SEAT_MOVE_FEE)}</span>
                <span>（決済時に請求）</span>
              </div>
              <div className={s.seatMovePanelActions}>
                <button type="button" className={shared.btn} onClick={() => setBuyoutTargetSeatId(null)}>
                  キャンセル
                </button>
                <button
                  type="button"
                  className={`${shared.btn} ${shared.btnSolid}`}
                  disabled={isSendingBuyout}
                  onClick={sendBuyoutRequest}
                >
                  {isSendingBuyout ? '送信中…' : '譲渡リクエストを送る'}
                </button>
              </div>
            </div>
          )}

          {activeBuyouts.length > 0 && (
            <div className={s.pendingMoveList}>
              <div className={s.pendingMoveTitle}>譲渡リクエスト</div>
              {activeBuyouts.map((req) => (
                <div key={req.requestId || req.seatId} className={s.pendingMoveRow}>
                  <span>
                    座席 <strong>{req.seatLabel}</strong> —{' '}
                    {req.status === 'APPROVED' ? '承認済み' : '承認待ち'}（{formatYen(SEAT_MOVE_FEE)}）
                  </span>
                  {req.status === 'PENDING' && (
                    <button
                      type="button"
                      className={s.pendingMoveRemove}
                      onClick={() => cancelBuyoutRequest(req.requestId)}
                    >
                      取り消す
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className={s.selectionInfo}>
            <div className={s.selectionSummaryTitle}>選択状況</div>
            <div className={s.selectionSummaryGrid}>
              <div className={s.selectionSummaryItem}>
                <span className={s.selectionSummaryLabel}>空席（確定）</span>
                <strong className={s.selectionSummaryValue}>
                  {selectedSeats.length} 席
                  <span className={s.selectionSummaryLimit}> / {MAX_SEATS_PER_BOOKING}</span>
                </strong>
                {selectedSeats.length > 0 && (
                  <span className={s.selectionSummaryDetail}>
                    {selectedSeats.map((item) => item.seat.id).join(' · ')}
                  </span>
                )}
              </div>
              {pendingBuyoutCount > 0 && (
                <div className={s.selectionSummaryItem}>
                  <span className={s.selectionSummaryLabel}>譲渡・承認待ち</span>
                  <strong className={s.selectionSummaryValue}>{pendingBuyoutCount} 件</strong>
                  <span className={s.selectionSummaryDetail}>
                    {activeBuyouts
                      .filter((item) => item.status === 'PENDING')
                      .map((item) => item.seatLabel)
                      .join(' · ')}
                  </span>
                </div>
              )}
              {approvedBuyoutCount > 0 && (
                <div className={s.selectionSummaryItem}>
                  <span className={s.selectionSummaryLabel}>譲渡・承認済み</span>
                  <strong className={s.selectionSummaryValue}>{approvedBuyoutCount} 席</strong>
                  <span className={s.selectionSummaryDetail}>
                    {activeBuyouts
                      .filter((item) => item.status === 'APPROVED')
                      .map((item) => item.seatLabel)
                      .join(' · ')}
                  </span>
                </div>
              )}
            </div>
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
              {selectedSeats.length > 0 || pendingBuyoutCount > 0
                ? '座席ごとに券種をお選びください。承認待ちの譲渡席もチケット代を前払いします。'
                : '空席の選択がありません。承認済みの譲渡席とリクエスト料は確認画面でまとめてお支払いします。'}
            </p>
          </div>

          {activeBuyouts.length > 0 && (
            <div className={s.exchangeOnlyNote}>
              承認待ちの譲渡席は<strong>チケット代＋譲渡リクエスト料（¥{SEAT_MOVE_FEE}/件）</strong>を前払いします。
              リクエストが<strong>拒否</strong>された場合は<strong>予約全体を全額返金</strong>します。
              ご自身で取り消した場合や、承諾時の連鎖キャンセル分は該当席のみ返金されます。
            </div>
          )}

          <div className={s.ticketList}>
            {activeBuyouts
              .filter((req) => req.status === 'PENDING')
              .map((req) => {
                const isPremium = getBuyoutSeatPremium(req.seatLabel);
                const ticketTypeId = buyoutTicketTypes[req.seatId] ?? ticketTypes[0]?.id ?? 'general';
                return (
                  <div key={`buyout-ticket-${req.requestId || req.seatId}`} className={s.ticketRow}>
                    <div className={s.ticketRowSeat}>
                      <span className={s.ticketRowLabel}>譲渡・承認待ち</span>
                      <strong>
                        {req.seatLabel}
                        {isPremium ? '（プレミアム）' : ''}
                      </strong>
                    </div>
                    <select
                      className={s.ticketSelect}
                      value={ticketTypeId}
                      onChange={(e) => updateBuyoutTicketType(req.seatId, e.target.value)}
                    >
                      {ticketTypes.map((ticket) => (
                        <option key={ticket.id} value={ticket.id}>
                          {ticket.nameJa} — {formatYen(calcSeatPriceFromList(ticket.id, isPremium))}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
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

          {approvedBookingSeats.length > 0 && (
            <div className={s.pendingMoveList}>
              <div className={s.pendingMoveTitle}>承認済みの譲渡席</div>
              {approvedBookingSeats.map((seat) => (
                <div key={seat.seatLabel} className={s.pendingMoveRow}>
                  <span>
                    座席 <strong>{seat.seatLabel}</strong> — {seat.ticketTypeName}
                  </span>
                  <strong>{formatYen(seat.unitPrice)}</strong>
                </div>
              ))}
            </div>
          )}

          {activeBuyouts.length > 0 && (
            <div className={s.pendingMoveList}>
              <div className={s.pendingMoveTitle}>譲渡リクエスト料</div>
              {activeBuyouts.map((req) => (
                <div key={req.requestId || req.seatId} className={s.pendingMoveRow}>
                  <span>
                    {req.seatLabel}（{req.status === 'APPROVED' ? '承認済み' : '承認待ち'}）
                  </span>
                  <strong>{formatYen(SEAT_MOVE_FEE)}</strong>
                </div>
              ))}
              {pendingBuyoutCount > 0 && (
                <div className={s.pendingMoveRow}>
                  <span>承認待ち譲渡席のチケット代（前払い）</span>
                  <strong>{formatYen(pendingBuyoutTicketFees)}</strong>
                </div>
              )}
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
              onClick={goToConfirmStep}
            >
              内容を確認
            </button>
          </div>
        </div>
      )}

      {step === 'buyoutNotice' && selection && buyoutRequests.length > 0 && (
        <div className={`${s.panel} ${themeClass}`}>
          <div className={s.panelHead}>
            <div className={shared.sectionHint}>Step {stepNumber}</div>
            <h2 className={s.panelTitle}>座席譲渡リクエストの確認</h2>
            <p className={s.panelLead}>
              先約済みの席へ譲渡を依頼しています。料金確認の前に、連鎖キャンセルと期限についてご確認ください。
            </p>
          </div>

          <div className={s.buyoutNoticeBox} role="note">
            <p className={s.buyoutNoticeLead}>
              本リクエストは<strong>席の交換ではなく、座席の買い取り（譲渡依頼）</strong>です。
              先約者が承諾すると、その席があなたの仮予約に紐づき、お支払い完了で確定します。
            </p>
            <ul className={s.buyoutNoticeList}>
              <li>
                <strong>拒否された場合:</strong>{' '}
                同じ上映回の他の譲渡リクエスト（PENDING）も<strong>連鎖でキャンセル</strong>され、
                <strong>お支払い済みの予約全体が全額返金</strong>されます。
              </li>
              <li>
                <strong>承諾された場合:</strong>{' '}
                承認された席以外の PENDING も<strong>連鎖でキャンセル</strong>されます（1 席のみ取得）。
              </li>
              <li>
                <strong>有効期限:</strong> 上映の<strong>30 分前まで</strong>（以降は送信・承認不可）。
              </li>
              <li>
                <strong>お支払い:</strong> 空席・承認待ち譲渡席のチケット代と譲渡リクエスト料を<strong>まとめて決済</strong>します。
                承認待ち席はチケット代も前払いとなります。
              </li>
            </ul>
          </div>

          {screeningUrgency?.kind === 'unlikely' && (
            <div className={s.buyoutUrgencyWarn} role="alert">
              上映まで残り約 {formatMinutesRemaining(screeningUrgency.minutesUntil)} です。
              先約者の承認が間に合わない可能性が<strong>高い</strong>ため、空席の選択もご検討ください。
            </div>
          )}

          {screeningUrgency?.kind === 'cutoff' && (
            <div className={s.buyoutUrgencyWarn} role="alert">
              上映 30 分前を過ぎているため、譲渡リクエストの承認はできません。
            </div>
          )}

          {screeningUrgency && screeningUrgency.kind !== 'started' && (
            <div className={s.buyoutDemoTimer} aria-hidden="false">
              <span className={s.buyoutDemoTimerLabel}>お支払いの目安（デモ表示）</span>
              <strong className={s.buyoutDemoTimerValue}>
                上映開始まで 約 {formatMinutesRemaining(screeningUrgency.minutesUntil)}
              </strong>
              <span className={s.buyoutDemoTimerNote}>
                ※ 発表用の表示です。実際のカウントダウンは実装していません。
              </span>
            </div>
          )}

          <div className={s.pendingMoveList}>
            <div className={s.pendingMoveTitle}>送信済みの譲渡リクエスト</div>
            {buyoutRequests.map((req) => (
              <div key={req.requestId || req.seatId} className={s.pendingMoveRow}>
                <span>
                  座席 <strong>{req.seatId}</strong> — 承認待ち（チケット代＋¥{SEAT_MOVE_FEE}）
                </span>
                <button
                  type="button"
                  className={s.pendingMoveRemove}
                  onClick={() => cancelBuyoutRequest(req.requestId)}
                >
                  取り消す
                </button>
              </div>
            ))}
          </div>

          <div className={s.actions}>
            <button type="button" className={shared.btn} onClick={() => setStep('tickets')}>
              券種に戻る
            </button>
            <button
              type="button"
              className={`${shared.btn} ${shared.btnSolid}`}
              onClick={() => goToStep('confirm')}
            >
              理解した — 料金確認へ
            </button>
          </div>
        </div>
      )}

      {step === 'confirm' && selection && (
        <div className={`${s.panel} ${themeClass}`}>
          <div className={s.panelHead}>
            <div className={shared.sectionHint}>Step {stepNumber}</div>
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
            {approvedBookingSeats.map((seat) => (
              <div key={`approved-${seat.seatLabel}`} className={s.confirmSeatRow}>
                <span>{seat.seatLabel} · 譲渡承認済み</span>
                <span>{seat.ticketTypeName}</span>
                <strong>{formatYen(seat.unitPrice)}</strong>
              </div>
            ))}
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
            {activeBuyouts
              .filter((req) => req.status === 'PENDING')
              .map((req) => {
                const ticketTypeId = buyoutTicketTypes[req.seatId] ?? ticketTypes[0]?.id ?? 'general';
                const ticket = ticketTypes.find((t) => t.id === ticketTypeId) ?? TICKET_TYPES[0];
                const ticketPrice = calcSeatPriceFromList(ticketTypeId, getBuyoutSeatPremium(req.seatLabel));
                return (
                  <div key={`pending-ticket-${req.requestId || req.seatId}`} className={s.confirmSeatRow}>
                    <span>
                      {req.seatLabel} · 譲渡（承認待ち）
                      {getBuyoutSeatPremium(req.seatLabel) ? ' · プレミアム' : ''}
                    </span>
                    <span>{ticket.nameJa}</span>
                    <strong>{formatYen(ticketPrice)}</strong>
                  </div>
                );
              })}
            {activeBuyouts.map((req) => (
              <div key={`fee-${req.requestId || req.seatId}`} className={s.confirmSeatRow}>
                <span>譲渡リクエスト — {req.seatLabel}</span>
                <span>{req.status === 'APPROVED' ? '承認済み' : '承認待ち'}</span>
                <strong>{formatYen(SEAT_MOVE_FEE)}</strong>
              </div>
            ))}
          </div>

          <div className={s.totalBar}>
            <span>お支払い合計</span>
            <strong>{formatYen(totalAmount)}</strong>
          </div>

          <div className={s.prototypeNote}>
            座席料金と譲渡リクエスト料をまとめて決済します。承認待ちの譲渡席はチケット代も前払いです。
            リクエストが<strong>拒否</strong>された場合は予約全体を<strong>全額返金</strong>します（モック）。
          </div>

          <div className={s.actions}>
            <button
              type="button"
              className={shared.btn}
              onClick={() => setStep(buyoutRequests.length > 0 ? 'buyoutNotice' : 'tickets')}
            >
              {buyoutRequests.length > 0 ? '譲渡確認に戻る' : '券種に戻る'}
            </button>
            <button
              type="button"
              className={`${shared.btn} ${shared.btnSolid} ${s.submitBtn}`}
              disabled={isSubmitting || !canPay}
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
