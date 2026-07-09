import { prisma } from '@/lib/prisma';
import { asBigIntId } from '@/lib/api/bookingPayload';
import { jsonError, jsonOk } from '@/lib/api/response';
import { getSessionUser } from '@/lib/api/session';
import { refundInactiveMoveFeesForBooking } from '@/lib/api/seatMoveService';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return jsonError('ログインしてください', 401);
  }

  const { id } = await context.params;
  const requestId = asBigIntId(id, 'id');

  try {
    const result = await prisma.$transaction(async (tx) => {
      const seatMoveRequest = await tx.seatMoveRequest.findUnique({
        where: { id: requestId },
      });

      if (!seatMoveRequest) {
        throw new Error('リクエストが見つかりません');
      }
      if (seatMoveRequest.requesterUserId !== sessionUser.id) {
        throw new Error('このリクエストを取り消す権限がありません');
      }
      if (seatMoveRequest.status !== 'PENDING') {
        throw new Error('承認待ちのリクエストのみ取り消せます');
      }

      await tx.seatMoveRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED', respondedAt: new Date() },
      });

      const refunded = await refundInactiveMoveFeesForBooking(
        tx,
        seatMoveRequest.requesterBookingId,
      );

      return { cancelled: true, refunded };
    });

    return jsonOk(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '取り消しに失敗しました';
    const status = message.includes('権限') ? 403 : message.includes('見つかりません') ? 404 : 400;
    return jsonError(message, status);
  }
}
