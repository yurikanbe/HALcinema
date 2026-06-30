export interface CreateBookingSeatInput {
  seatId: string | number;
  ticketTypeId: string | number;
}

export interface CreateBookingPayload {
  screeningId?: string | number;
  userId?: string | number | null;
  bookingType?: 'MEMBER' | 'GUEST';
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  paymentMethod?: 'CREDIT_CARD' | 'QR';
  seats?: CreateBookingSeatInput[];
}

export function asBigIntId(value: unknown, fieldName: string): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return BigInt(value);
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return BigInt(value);
  throw new Error(`${fieldName} must be a positive integer id`);
}

export function optionalBigIntId(value: unknown, fieldName: string): bigint | null {
  if (value === undefined || value === null || value === '') return null;
  return asBigIntId(value, fieldName);
}

export function assertCreateBookingPayload(value: unknown): CreateBookingPayload {
  if (!value || typeof value !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const payload = value as CreateBookingPayload;

  if (!payload.screeningId) {
    throw new Error('screeningId is required');
  }

  if (!Array.isArray(payload.seats) || payload.seats.length === 0) {
    throw new Error('At least one seat is required');
  }

  if (payload.seats.length > 6) {
    throw new Error('A booking can contain at most 6 seats');
  }

  for (const seat of payload.seats) {
    if (!seat || typeof seat !== 'object') {
      throw new Error('Each seat must be an object');
    }
    asBigIntId(seat.seatId, 'seatId');
    asBigIntId(seat.ticketTypeId, 'ticketTypeId');
  }

  if (payload.bookingType === 'GUEST' || !payload.userId) {
    if (!payload.guestName?.trim()) throw new Error('guestName is required for guest booking');
    if (!payload.guestEmail?.trim()) throw new Error('guestEmail is required for guest booking');
  }

  return payload;
}

export function createBookingNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
  return `HAL-${timestamp}-${random}`;
}
