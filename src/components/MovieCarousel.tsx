'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import type { Movie } from '@/types';
import shared from '@/styles/shared.module.css';
import s from './MovieCarousel.module.css';

interface Props { movies: Movie[] }

const CARD_W = 175;
const GAP    = 12;
const SLOT   = CARD_W + GAP; // 187px per card slot
const ARROW  = 80;            // 40px padding × 2 for arrow buttons

export default function MovieCarousel({ movies }: Props) {
  const M           = movies.length;
  const carouselRef = useRef<HTMLDivElement>(null);
  const trackRef    = useRef<HTMLDivElement>(null);
  const busyRef     = useRef(false);

  /* ── Sizing: fit N whole cards, set carousel width to match ── */
  useEffect(() => {
    const carousel = carouselRef.current;
    const track    = trackRef.current;
    if (!carousel || !track) return;
    const parent = carousel.parentElement;
    if (!parent) return;

    const fit = () => {
      const n      = Math.max(1, Math.floor((parent.clientWidth - ARROW + GAP) / SLOT));
      const trackW = n * SLOT - GAP;
      track.style.width    = `${trackW}px`;
      carousel.style.width = `${trackW + ARROW}px`;
    };

    const ro = new ResizeObserver(fit);
    ro.observe(parent);
    fit();

    // Start at the real cards section (past the clone-start block)
    track.scrollLeft = M * SLOT;

    return () => ro.disconnect();
  }, [M]);

  /* ── Loop: after scroll settles, jump if inside clone zone ── */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScrollEnd = () => {
      const sl = track.scrollLeft;
      if (sl < M * SLOT)           track.scrollLeft = sl + M * SLOT;
      else if (sl >= 2 * M * SLOT) track.scrollLeft = sl - M * SLOT;
      busyRef.current = false;
    };

    track.addEventListener('scrollend', onScrollEnd);
    return () => track.removeEventListener('scrollend', onScrollEnd);
  }, [M]);

  /* ── Arrow buttons ── */
  const scroll = (dir: 'left' | 'right') => {
    const track = trackRef.current;
    if (!track || busyRef.current) return;
    busyRef.current = true;
    track.scrollTo({
      left: track.scrollLeft + (dir === 'right' ? SLOT : -SLOT),
      behavior: 'smooth',
    });
    // Fallback unlock for browsers without scrollend support
    setTimeout(() => { busyRef.current = false; }, 600);
  };

  /* ── Render helper ── */
  const renderCards = (keyPrefix: string, interactive: boolean) =>
    movies.map((m, i) => (
      <Link
        key={`${keyPrefix}${i}`}
        className={`${shared.filmCardPortrait} ${s.card}`}
        href={`/movies/${m.id}`}
        tabIndex={interactive ? 0 : -1}
        aria-hidden={interactive ? undefined : true}
      >
        <div className={shared.filmCardPoster} style={{ backgroundImage: `url('${m.poster}')` }}>
          <div className={shared.filmCardPosterOverlay} />
          <div className={shared.filmCardBadge}>{m.category}</div>
        </div>
        <div className={shared.filmCardBody}>
          <div className={shared.filmCardTitle}>{m.title}</div>
          <div className={shared.filmCardFooter}>
            <div className={shared.filmCardMeta}>{m.formats?.join('・') ?? '—'}</div>
            <span className={shared.filmCardCta}>詳細 →</span>
          </div>
        </div>
      </Link>
    ));

  return (
    <div className={s.carousel} ref={carouselRef}>
      <button className={`${s.arrow} ${s.arrowLeft}`} onClick={() => scroll('left')} aria-label="前へ">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>

      <div className={s.track} ref={trackRef}>
        {renderCards('s', false)}
        {renderCards('r', true)}
        {renderCards('e', false)}
      </div>

      <button className={`${s.arrow} ${s.arrowRight}`} onClick={() => scroll('right')} aria-label="次へ">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>
  );
}
