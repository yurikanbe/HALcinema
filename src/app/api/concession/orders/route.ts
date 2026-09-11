import { prisma } from '@/lib/prisma';
import { asBigIntId, optionalBigIntId } from '@/lib/api/bookingPayload';
import { jsonError, jsonOk } from '@/lib/api/response';
import { getSessionUser } from '@/lib/api/session';

interface OrderItemInput {
  productId?: string | number;
  quantity?: number;
}

interface CreateOrderPayload {
  bookingId?: string | number;
  pickupCounterId?: string | number;
  items?: OrderItemInput[];
}

function createPickupCode(): string {
  return `F${Date.now().toString(36).toUpperCase().slice(-5)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return jsonError('館内注文にはログインが必要です', 401);
  }

  let payload: CreateOrderPayload;
  try {
    payload = await request.json();
  } catch {
    return jsonError('Request body must be JSON', 400);
  }

  if (!payload.items?.length) {
    return jsonError('注文商品を1つ以上選択してください', 400);
  }

  let pickupCounterId: bigint;
  let bookingId: bigint | null = null;
  try {
    pickupCounterId = asBigIntId(payload.pickupCounterId, 'pickupCounterId');
    bookingId = optionalBigIntId(payload.bookingId, 'bookingId');
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Invalid payload', 400);
  }

  const normalizedItems = payload.items.map((item) => ({
    productId: asBigIntId(item.productId, 'productId'),
    quantity: Math.max(1, Math.min(10, Number(item.quantity ?? 1))),
  }));

  try {
    const order = await prisma.$transaction(async (tx) => {
      const counter = await tx.pickupCounter.findFirst({
        where: { id: pickupCounterId, isActive: true },
      });
      if (!counter) throw new Error('受取カウンターが見つかりません');

      if (bookingId) {
        const booking = await tx.booking.findFirst({
          where: { id: bookingId, userId: sessionUser.id, status: 'CONFIRMED' },
        });
        if (!booking) throw new Error('関連する予約が見つかりません');
      }

      const productIds = [...new Set(normalizedItems.map((item) => item.productId.toString()))].map(
        BigInt,
      );
      const products = await tx.concessionProduct.findMany({
        where: { id: { in: productIds }, isActive: true },
      });
      const productById = new Map(products.map((product) => [product.id.toString(), product]));
      if (productById.size !== productIds.length) {
        throw new Error('選択した商品の一部が利用できません');
      }

      const lineItems = normalizedItems.map((item) => {
        const product = productById.get(item.productId.toString())!;
        return {
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price,
        };
      });
      const totalAmount = lineItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );

      return tx.concessionOrder.create({
        data: {
          userId: sessionUser.id,
          bookingId,
          pickupCounterId,
          pickupCode: createPickupCode(),
          status: 'PENDING',
          totalAmount,
          items: { create: lineItems },
        },
        include: {
          items: { include: { product: true } },
          pickupCounter: { include: { screen: true } },
        },
      });
    });

    // デモ: 数秒で調理完了扱いにする代わりに即 READY
    const readyOrder = await prisma.concessionOrder.update({
      where: { id: order.id },
      data: { status: 'READY', readyAt: new Date() },
      include: {
        items: { include: { product: true } },
        pickupCounter: { include: { screen: true } },
      },
    });

    return jsonOk(
      {
        order: {
          id: readyOrder.id.toString(),
          pickupCode: readyOrder.pickupCode,
          status: readyOrder.status,
          totalAmount: readyOrder.totalAmount,
          pickupCounter: {
            name: readyOrder.pickupCounter.name,
            locationLabel: readyOrder.pickupCounter.locationLabel,
            screenLabel: `${readyOrder.pickupCounter.screen.conceptName} Screen ${readyOrder.pickupCounter.screen.screenNumber}`,
          },
          items: readyOrder.items.map((item) => ({
            nameJa: item.product.nameJa,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : '注文に失敗しました', 400);
  }
}
