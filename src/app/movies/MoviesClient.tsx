'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Movie } from '@/types';
import FilterButtonGroup from '@/components/FilterButtonGroup';
import shared from '@/styles/shared.module.css';

const THEATER_LABEL: Record<string,string> = { starry: 'Starry', abyss: 'Abyss', cyber: 'Cyber' };

function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

interface Props {
  nowShowing: Movie[];
  comingSoon: Movie[];
  theatersByMovie: Record<string, string[]>;
}

export default function MoviesClient({ nowShowing, comingSoon, theatersByMovie }: Props) {
  const [activeTheater, setActiveTheater] = useState('all');

  const filteredNow = nowShowing.filter(m => {
    if (activeTheater === 'all') return true;
    return (theatersByMovie[m.id] ?? []).includes(activeTheater);
  });

  return (
    <>
      {/* ── Now Showing ── */}
      <section className={shared.section}>
        <div className={shared.sectionHead}>
          <div>
            <div className={shared.sectionHint}>Now Showing</div>
            <h2 className={shared.sectionTitle}>上映中</h2>
          </div>
          <FilterButtonGroup
            options={['all', 'starry', 'abyss', 'cyber'].map(t => ({
              value: t,
              label: t === 'all' ? 'すべて' : THEATER_LABEL[t],
            }))}
            active={activeTheater}
            onChange={setActiveTheater}
            className={shared.moviesFilter}
            id="theater-filter"
          />
        </div>

        <div className={`${shared.filmGrid} ${shared.filmGridMovies}`} id="now-showing-grid">
          {filteredNow.map(m => {
            const theaters = (theatersByMovie[m.id] ?? []).map(t => THEATER_LABEL[t]).join('・');
            return (
              <Link key={m.id} className={`${shared.filmCard} ${shared.filmCardPortrait}`} href={`/movies/${m.id}`}>
                <div className={shared.filmCardPoster} style={{ backgroundImage: `url('${m.poster}')` }}>
                  <div className={shared.filmCardPosterOverlay}></div>
                  <div className={shared.filmCardBadge}>{m.category}</div>
                </div>
                <div className={shared.filmCardBody}>
                  <div className={shared.filmCardTitle}>{m.title}</div>
                  <div className={shared.filmCardFooter}>
                    <div className={shared.filmCardMeta}>{formatDuration(m.duration)} · {theaters || '—'}</div>
                    <span className={shared.filmCardCta}>詳細 →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className={shared.sectionDivider}><hr /></div>

      {/* ── Coming Soon ── */}
      <section className={shared.section}>
        <div className={shared.sectionHead}>
          <div>
            <div className={shared.sectionHint}>Coming Soon</div>
            <h2 className={shared.sectionTitle}>近日公開</h2>
          </div>
        </div>
        <div className={`${shared.filmGrid} ${shared.filmGridMovies}`}>
          {comingSoon.map(m => (
            <Link key={m.id} className={`${shared.filmCard} ${shared.filmCardPortrait}`} href={`/movies/${m.id}`}>
              <div className={shared.filmCardPoster} style={{ backgroundImage: `url('${m.poster}')` }}>
                <div className={shared.filmCardBadge}>{m.category}</div>
              </div>
              <div className={shared.filmCardBody}>
                <div className={shared.filmCardTitle}>{m.title}</div>
                <div className={shared.filmCardFooter}>
                  <div className={shared.filmCardMeta}>{formatDuration(m.duration)}</div>
                  <span className={shared.filmCardCta}>詳細 →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
