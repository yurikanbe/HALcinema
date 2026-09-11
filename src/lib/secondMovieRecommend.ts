import type { ScreeningFormat } from '@prisma/client';
import {
  SECOND_MOVIE_SAFETY_BUFFER_MINUTES,
  fallbackWalkMinutes,
} from '@/lib/secondMovieConfig';

const FORMAT_LABEL: Record<ScreeningFormat, string> = {
  SUBTITLED: '字幕',
  DUBBED: '吹替',
  ORIGINAL: 'オリジナル',
};

export interface RecommendableScreening {
  id: bigint;
  startTime: Date;
  endTime: Date;
  format: ScreeningFormat;
  movie: {
    id: bigint;
    slug: string;
    titleJa: string;
    genre: string | null;
    durationMinutes: number;
    posterImageUrl: string | null;
    normalPrice: number;
    secondMoviePrice: number;
  };
  screen: {
    id: bigint;
    screenNumber: number;
    conceptName: string;
    theater: { name: string } | null;
  };
  availableSeats: number;
}

export interface SecondMovieRecommendation {
  screeningId: string;
  movieId: string;
  movieTitle: string;
  poster?: string;
  genre?: string;
  startTime: string;
  startTimeLabel: string;
  screenLabel: string;
  conceptName: string;
  theaterName: string;
  format: string;
  availableSeats: number;
  walkMinutes: number;
  minutesUntilStart: number;
  normalPrice: number;
  secondMoviePrice: number;
  score: number;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo',
  }).format(date);
}

function genreMatchScore(firstGenre: string | null, candidateGenre: string | null): number {
  if (!firstGenre || !candidateGenre) return 0;
  if (firstGenre === candidateGenre) return 30;
  const first = firstGenre.toLowerCase();
  const second = candidateGenre.toLowerCase();
  if (first.includes(second) || second.includes(first)) return 15;
  return 0;
}

export function buildSecondMovieRecommendations(params: {
  now: Date;
  firstScreenId: bigint;
  firstConceptName: string;
  firstGenre: string | null;
  firstEndTime: Date;
  candidates: RecommendableScreening[];
  walkMinutesByTargetScreen: Map<string, number>;
  safetyBufferMinutes?: number;
}): SecondMovieRecommendation[] {
  const buffer = params.safetyBufferMinutes ?? SECOND_MOVIE_SAFETY_BUFFER_MINUTES;
  const referenceTime = params.now.getTime() >= params.firstEndTime.getTime()
    ? params.now
    : params.firstEndTime;

  const eligible = params.candidates
    .filter((candidate) => {
      if (candidate.screen.id === params.firstScreenId) return false;
      if (candidate.availableSeats <= 0) return false;
      if (candidate.startTime.getTime() <= referenceTime.getTime()) return false;

      const walkMinutes =
        params.walkMinutesByTargetScreen.get(candidate.screen.id.toString()) ??
        fallbackWalkMinutes(params.firstConceptName, candidate.screen.conceptName);

      const minutesUntilStart =
        (candidate.startTime.getTime() - referenceTime.getTime()) / 60000;
      const requiredMinutes = walkMinutes + buffer;

      return minutesUntilStart >= requiredMinutes;
    })
    .map((candidate) => {
      const walkMinutes =
        params.walkMinutesByTargetScreen.get(candidate.screen.id.toString()) ??
        fallbackWalkMinutes(params.firstConceptName, candidate.screen.conceptName);
      const minutesUntilStart =
        (candidate.startTime.getTime() - referenceTime.getTime()) / 60000;
      const seatScore = Math.min(candidate.availableSeats, 50);
      const urgencyScore = Math.max(0, 40 - minutesUntilStart * 2);
      const genreScore = genreMatchScore(params.firstGenre, candidate.movie.genre);
      const discount = candidate.movie.normalPrice - candidate.movie.secondMoviePrice;
      const discountScore = Math.min(Math.max(discount / 10, 0), 20);
      const score = seatScore + urgencyScore + genreScore + discountScore;

      return {
        screeningId: candidate.id.toString(),
        movieId: candidate.movie.slug,
        movieTitle: candidate.movie.titleJa,
        poster: candidate.movie.posterImageUrl ?? undefined,
        genre: candidate.movie.genre ?? undefined,
        startTime: candidate.startTime.toISOString(),
        startTimeLabel: formatTime(candidate.startTime),
        screenLabel: `Screen ${candidate.screen.screenNumber}`,
        conceptName: candidate.screen.conceptName,
        theaterName: candidate.screen.theater?.name ?? '',
        format: FORMAT_LABEL[candidate.format],
        availableSeats: candidate.availableSeats,
        walkMinutes,
        minutesUntilStart: Math.round(minutesUntilStart),
        normalPrice: candidate.movie.normalPrice,
        secondMoviePrice: candidate.movie.secondMoviePrice,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return eligible;
}
