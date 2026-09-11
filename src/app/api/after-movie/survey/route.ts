import { prisma } from '@/lib/prisma';
import { asBigIntId } from '@/lib/api/bookingPayload';
import { jsonError, jsonOk } from '@/lib/api/response';
import { getSessionUser } from '@/lib/api/session';
import { userWatchedFirstMovieToday } from '@/lib/api/secondMovieService';
import { AFTER_MOVIE_SURVEY, type AfterMovieSurveyAnswers } from '@/lib/afterMovieSurvey';

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return jsonError('アンケート回答にはログインが必要です', 401);
  }

  let payload: {
    bookingId?: string | number;
    answers?: AfterMovieSurveyAnswers;
    simulateEnd?: boolean;
  };
  try {
    payload = await request.json();
  } catch {
    return jsonError('Request body must be JSON', 400);
  }

  let bookingId: bigint;
  try {
    bookingId = asBigIntId(payload.bookingId, 'bookingId');
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Invalid bookingId', 400);
  }

  const answers = payload.answers ?? {};
  for (const item of AFTER_MOVIE_SURVEY) {
    const value = answers[item.id];
    if (!value || !(item.options as readonly string[]).includes(value)) {
      return jsonError(`「${item.question}」への回答が必要です`, 400);
    }
  }

  const now = new Date();
  const eligibility = await userWatchedFirstMovieToday({
    userId: sessionUser.id,
    bookingId,
    now,
    simulateEnd: payload.simulateEnd === true,
  });
  if (!eligibility.ok || !eligibility.booking) {
    return jsonError(eligibility.reason ?? 'アンケートを提出できません', 400);
  }

  if (eligibility.booking.afterSurveyCompletedAt) {
    return jsonOk({
      alreadyCompleted: true,
      discountUnlocked: true,
      message: 'アンケートは回答済みです。2本目割引が適用されます。',
    });
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      afterSurveyCompletedAt: now,
      afterSurveyAnswers: answers,
    },
  });

  await prisma.userNotification.create({
    data: {
      userId: sessionUser.id,
      bookingId,
      kind: 'SECOND_MOVIE',
      title: '2本目が割引になりました',
      body: 'アンケートへのご協力ありがとうございます。別スクリーンの直近上映を割引価格でご案内します。',
      href: `/mypage/history/${bookingId}/after${payload.simulateEnd ? '?simulateEnd=1' : ''}`,
    },
  });

  return jsonOk({
    alreadyCompleted: false,
    discountUnlocked: true,
    message: 'アンケート回答完了。2本目限定価格が解放されました。',
  });
}
