import { prisma } from '@/lib/prisma';
import { asBigIntId } from '@/lib/api/bookingPayload';
import { jsonError, jsonOk } from '@/lib/api/response';
import { getSessionUser } from '@/lib/api/session';
import { ensureAfterMovieNotifications } from '@/lib/api/afterMovieNotify';

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return jsonError('通知の確認にはログインが必要です', 401);
  }

  const { searchParams } = new URL(request.url);
  const simulateBookingIdParam = searchParams.get('simulateBookingId');

  await ensureAfterMovieNotifications({
    userId: sessionUser.id,
    simulateBookingId: simulateBookingIdParam
      ? asBigIntId(simulateBookingIdParam, 'simulateBookingId')
      : undefined,
  });

  const notifications = await prisma.userNotification.findMany({
    where: { userId: sessionUser.id },
    orderBy: { createdAt: 'desc' },
    take: 40,
  });

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  return jsonOk({
    unreadCount,
    notifications: notifications.map((item) => ({
      id: item.id.toString(),
      kind: item.kind,
      title: item.title,
      body: item.body,
      href: item.href,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      bookingId: item.bookingId?.toString() ?? null,
    })),
  });
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return jsonError('ログインが必要です', 401);
  }

  let payload: { id?: string | number; markAllRead?: boolean };
  try {
    payload = await request.json();
  } catch {
    return jsonError('Request body must be JSON', 400);
  }

  const now = new Date();

  if (payload.markAllRead) {
    await prisma.userNotification.updateMany({
      where: { userId: sessionUser.id, readAt: null },
      data: { readAt: now },
    });
    return jsonOk({ ok: true });
  }

  if (!payload.id) {
    return jsonError('id or markAllRead is required', 400);
  }

  const id = asBigIntId(payload.id, 'id');
  const updated = await prisma.userNotification.updateMany({
    where: { id, userId: sessionUser.id },
    data: { readAt: now },
  });
  if (updated.count === 0) {
    return jsonError('通知が見つかりません', 404);
  }

  return jsonOk({ ok: true });
}
