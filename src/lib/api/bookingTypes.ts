export interface BookingView {
  id: string;
  bookingNumber: string;
  bookingType: 'MEMBER' | 'GUEST';
  guestName: string | null;
  guestEmail: string | null;
  totalAmount: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
  screening: {
    startTime: string;
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
}
