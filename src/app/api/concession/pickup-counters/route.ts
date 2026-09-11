import { prisma } from '@/lib/prisma';
import { asBigIntId } from '@/lib/api/bookingPayload';
import { jsonError, jsonOk } from '@/lib/api/response';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromScreenIdParam = searchParams.get('fromScreenId');

  let screenId: bigint | undefined;
  if (fromScreenIdParam) {
    try {
      screenId = asBigIntId(fromScreenIdParam, 'fromScreenId');
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : 'Invalid fromScreenId', 400);
    }
  }

  const counters = await prisma.pickupCounter.findMany({
    where: {
      isActive: true,
      ...(screenId ? { screenId } : {}),
    },
    include: {
      screen: { include: { theater: true } },
    },
    orderBy: [{ screenId: 'asc' }, { sortOrder: 'asc' }],
  });

  return jsonOk({
    counters: counters.map((counter) => ({
      id: counter.id.toString(),
      name: counter.name,
      locationLabel: counter.locationLabel,
      screenId: counter.screenId.toString(),
      screenLabel: `${counter.screen.conceptName} / Screen ${counter.screen.screenNumber}`,
      theaterName: counter.screen.theater?.name ?? '',
    })),
  });
}
