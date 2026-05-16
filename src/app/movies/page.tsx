'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Carousel3D from '@/components/Carousel3D';
import moviesData   from '@/data/movies.json';
import schedulesData from '@/data/schedules.json';
import type { Movie, ScreenSchedule } from '@/types';

const movies    = moviesData    as Movie[];
const schedules = schedulesData as ScreenSchedule[];

// Derive which theaters show each movie
function getTheatersForMovie(movieId: string): string[] {
  const set = new Set<string>();
  for (const s of schedules) {
    for (const show of s.shows) {
      if (show.movieId === movieId) set.add(s.theaterId);
    }
  }
  return Array.from(set);
}

const THEATER_LABEL: Record<string,string> = { starry: 'Starry', abyss: 'Abyss', cyber: 'Cyber' };

function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export default function MoviesPage() {
  const [activeTheater, setActiveTheater] = useState('all');

  useEffect(() => { document.title = 'HAL CINEMA | 映画一覧'; }, []);

  const nowShowing  = movies.filter(m => m.status === 'now_showing');
  const comingSoon  = movies.filter(m => m.status === 'coming_soon');

  const carouselMovies = nowShowing.map(m => ({
    id: m.id, title: m.title, category: m.category, poster: m.poster, description: m.description,
  }));

  const filteredNow = nowShowing.filter(m => {
    if (activeTheater === 'all') return true;
    return getTheatersForMovie(m.id).includes(activeTheater);
  });

  return (
    <>
      {/* ── Dark Cinematic Hero + 22-item Carousel ── */}
      <div className="movies-hero">
        <div className="movies-hero__header">
          <div className="movies-hero__eyebrow">Movie Lineup</div>
          <h1 className="movies-hero__title">上映ラインナップ</h1>
        </div>
        <div id="top-carousel">
          <Carousel3D movies={carouselMovies} itemCount={22} hasInfoPanel={false} />
        </div>
        <p className="movies-hero__hint">カードをクリックで詳細へ</p>
      </div>

      {/* ── Now Showing ── */}
      <section className="section">
        <div className="section__head">
          <div>
            <div className="section__hint">Now Showing</div>
            <h2 className="section__title">上映中</h2>
          </div>
          <div className="movies-filter" id="theater-filter">
            {['all', 'starry', 'abyss', 'cyber'].map(t => (
              <button
                key={t}
                className={`filter-btn${activeTheater === t ? ' active' : ''}`}
                data-theater={t}
                onClick={() => setActiveTheater(t)}
              >
                {t === 'all' ? 'すべて' : THEATER_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="film-grid film-grid--movies" id="now-showing-grid">
          {filteredNow.map(m => {
            const theaters = getTheatersForMovie(m.id).map(t => THEATER_LABEL[t]).join('・');
            return (
              <Link key={m.id} className="film-card film-card--portrait" href={`/movies/${m.id}`}>
                <div className="film-card__poster" style={{ backgroundImage: `url('${m.poster}')` }}>
                  <div className="film-card__poster-overlay"></div>
                  <div className="film-card__badge">{m.category}</div>
                </div>
                <div className="film-card__body">
                  <div className="film-card__title">{m.title}</div>
                  <div className="film-card__footer">
                    <div className="film-card__meta">{formatDuration(m.duration)} · {theaters || '—'}</div>
                    <span className="film-card__cta">詳細 →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="section-divider"><hr /></div>

      {/* ── Coming Soon ── */}
      <section className="section">
        <div className="section__head">
          <div>
            <div className="section__hint">Coming Soon</div>
            <h2 className="section__title">近日公開</h2>
          </div>
        </div>
        <div className="film-grid film-grid--movies">
          {comingSoon.map(m => (
            <Link key={m.id} className="film-card film-card--portrait" href={`/movies/${m.id}`}>
              <div className="film-card__poster" style={{ backgroundImage: `url('${m.poster}')` }}>
                <div className="film-card__poster-overlay"></div>
                <div className="film-card__badge">{m.category}</div>
                <div className="film-card__badge film-card__badge--status">Coming Soon</div>
              </div>
              <div className="film-card__body">
                <div className="film-card__title">{m.title}</div>
                <div className="film-card__footer">
                  <div className="film-card__meta">{formatDuration(m.duration)}</div>
                  <span className="film-card__cta">詳細 →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
