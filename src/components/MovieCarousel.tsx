'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import type { Movie } from '@/types';
import shared from '@/styles/shared.module.css';
import s from './MovieCarousel.module.css';

interface Props {
  movies: Movie[];
}

const CARD_W = 175;
const GAP    = 12;
const ARROW_AREA = 80; // 40px padding each side for arrow buttons

export default function MovieCarousel({ movies }: Props) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const trackRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const carousel = carouselRef.current;
    const track    = trackRef.current;
    if (!carousel || !track) return;

    // Observe the parent (grid column) so resizing the carousel itself
    // doesn't create an observer loop, and window resizes are caught.
    const parent = carousel.parentElement;
    if (!parent) return;

    const fit = () => {
      const inner = parent.clientWidth - ARROW_AREA;
      const n     = Math.max(1, Math.floor((inner + GAP) / (CARD_W + GAP)));
      const trackW = n * (CARD_W + GAP) - GAP;
      track.style.width   = `${trackW}px`;
      carousel.style.width = `${trackW + ARROW_AREA}px`;
    };

    const ro = new ResizeObserver(fit);
    ro.observe(parent);
    fit();
    return () => ro.disconnect();
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    trackRef.current?.scrollBy({
      left: dir === 'left' ? -(CARD_W + GAP) : CARD_W + GAP,
      behavior: 'smooth',
    });
  };

  return (
    <div className={s.carousel} ref={carouselRef}>
      <button className={`${s.arrow} ${s.arrowLeft}`} onClick={() => scroll('left')} aria-label="前へ">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>

      <div className={s.track} ref={trackRef}>
        {movies.map(m => (
          <Link
            key={m.id}
            className={`${shared.filmCardPortrait} ${s.card}`}
            href={`/movies/${m.id}`}
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
        ))}
      </div>

      <button className={`${s.arrow} ${s.arrowRight}`} onClick={() => scroll('right')} aria-label="次へ">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>
  );
}
