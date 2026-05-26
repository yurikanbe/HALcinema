import type { Metadata } from 'next';
import Carousel3D from '@/components/Carousel3D';
import moviesData    from '@/data/movies.json';
import schedulesData from '@/data/schedules.json';
import type { Movie, ScreenSchedule } from '@/types';
import MoviesClient from './MoviesClient';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | 映画一覧',
};

const movies    = moviesData    as Movie[];
const schedules = schedulesData as ScreenSchedule[];

const nowShowing = movies.filter(m => m.status === 'now_showing');
const comingSoon = movies.filter(m => m.status === 'coming_soon');
const theatersByMovie: Record<string, string[]> = Object.fromEntries(
  movies.map(m => [m.id, m.theaters])
);

function computeSeatStatus(movieId: string): 'sold_out' | 'few' | null {
  const shows = schedules.flatMap(sc => sc.shows.filter(sh => sh.movieId === movieId));
  if (!shows.length) return null;
  if (shows.every(sh => sh.taken)) return 'sold_out';
  if (shows.some(sh => !sh.taken && sh.seats !== undefined && sh.seats <= 15)) return 'few';
  return null;
}

const seatStatus: Record<string, 'sold_out' | 'few' | null> = Object.fromEntries(
  nowShowing.map(m => [m.id, computeSeatStatus(m.id)])
);

export default function MoviesPage() {
  const carouselMovies = nowShowing.map(m => ({
    id: m.id, title: m.title, category: m.category, poster: m.poster, description: m.description,
  }));

  return (
    <>
      {/* ── Dark Cinematic Hero + 22-item Carousel ── */}
      <div className={s.moviesHero}>
        <div className={s.moviesHeroHeader}>
          <div className={s.moviesHeroEyebrow}>Movie Lineup</div>
          <h1 className={s.moviesHeroTitle}>上映ラインナップ</h1>
        </div>
        <div id="top-carousel" className={s.topCarousel}>
          <Carousel3D movies={carouselMovies} itemCount={22} hasInfoPanel={false} />
        </div>
        <p className={s.moviesHeroHint}>カードをクリックで詳細へ</p>
      </div>

      <MoviesClient
        nowShowing={nowShowing}
        comingSoon={comingSoon}
        theatersByMovie={theatersByMovie}
        seatStatus={seatStatus}
      />
    </>
  );
}
