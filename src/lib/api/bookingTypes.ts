export interface BookingView {
  id: string;
  bookingNumber: string;
  bookingType: 'MEMBER' | 'GUEST';
  guestName: string | null;
  guestEmail: string | null;
  totalAmount: number;
  paymentStatus: string;
  status: string;
  isSecondMovie?: boolean;
  createdAt: string;
  screening: {
    id?: string;
    startTime: string;
    endTime?: string;
    format: string;
    movie: { titleJa: string; posterImageUrl: string | null };
    screen: {
      screenNumber: number;
      conceptName: string;
      theater: { name: string } | null;
    };
  };
  bookingSeats: {
    id: string;
    unitPrice: number;
    seat: { rowLabel: string; seatNumber: number };
    ticketType: { nameJa: string };
  }[];
  payments: { status: string; method: string; amount: number }[];
  requestedSeatMoves?: SeatMoveRequestView[];
  targetedSeatMoves?: SeatMoveRequestView[];
}

export interface SeatMoveRequestView {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';
  fee: number;
  cashbackAmount: number;
  requestedAt: string;
  respondedAt: string | null;
  requesterBookingId: string | null;
  targetBookingId: string;
  targetBookingSeat: { seat: { rowLabel: string; seatNumber: number } };
  requesterBookingSeat: { seat: { rowLabel: string; seatNumber: number } } | null;
}
