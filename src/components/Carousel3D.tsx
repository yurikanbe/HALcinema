'use client';

import { useRef, useEffect } from 'react';

const ALL_LETTERS = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v'];

export interface CarouselMovie {
  id: string;
  title: string;
  category: string;
  poster: string;
  description: string;
}

interface Carousel3DProps {
  movies: CarouselMovie[];
  itemCount?: 18 | 22;
  hasInfoPanel?: boolean;
}

export default function Carousel3D({ movies, itemCount = 18, hasInfoPanel = false }: Carousel3DProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const letters = ALL_LETTERS.slice(0, itemCount);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const carousel = wrapper.querySelector<HTMLElement>('.carousel');
    const nextBtn  = wrapper.querySelector<HTMLElement>('.next');
    const prevBtn  = wrapper.querySelector<HTMLElement>('.prev');
    const items    = carousel ? Array.from(carousel.querySelectorAll<HTMLElement>('.item')) : [];

    if (!carousel || !nextBtn || !prevBtn || items.length === 0) return;

    let currdeg = 0;
    const step = 360 / items.length;
    const movieData = items.map((_, i) => movies[i % movies.length]);
    const infoPanel = hasInfoPanel ? wrapper.querySelector<HTMLElement>('.carousel-info') : null;

    function normalizeAngle(a: number) {
      let v = ((a + 180) % 360) - 180;
      if (v > 180) v -= 360;
      if (v <= -180) v += 360;
      return v;
    }

    function truncateText(s: string, n: number) {
      return s.length > n ? s.slice(0, n - 1) + '…' : s;
    }

    function updateItems() {
      let centerIndex = 0;
      let smallest = Infinity;

      items.forEach((item, index) => {
        const itemAngle = index * step + currdeg;
        const rad = (itemAngle * Math.PI) / 180;
        const normalized = normalizeAngle(itemAngle);
        const isFront = Math.cos(rad) >= 0;
        const shouldShow = infoPanel ? (isFront && normalized >= 0) : isFront;

        item.style.opacity       = shouldShow ? '1' : '0';
        item.style.pointerEvents = shouldShow ? 'auto' : 'none';

        const m = movieData[index];
        if (m?.poster) {
          item.style.backgroundImage    = `url('${m.poster}')`;
          item.style.backgroundSize     = 'cover';
          item.style.backgroundPosition = 'center';
        }

        const absNorm = Math.abs(normalized);
        if (absNorm < smallest) { smallest = absNorm; centerIndex = index; }
      });

      if (infoPanel) {
        const d     = movieData[centerIndex];
        const tag   = infoPanel.querySelector<HTMLElement>('.card__tag');
        const title = infoPanel.querySelector<HTMLElement>('.card__title');
        const short = infoPanel.querySelector<HTMLElement>('.card__short');
        const link  = infoPanel.querySelector<HTMLAnchorElement>('.carousel-detail-link');
        const rsv   = infoPanel.querySelector<HTMLAnchorElement>('.carousel-reserve-link');
        if (tag)   tag.textContent   = d.category || 'Movie';
        if (title) title.textContent = d.title    || 'Untitled';
        if (short) short.textContent = truncateText(d.description || '', 130);
        if (link)  link.href         = `/movies/${d.id}`;
        if (rsv)   rsv.href          = `/reserve`;
      }
    }

    items.forEach((item, index) => {
      item.addEventListener('click', () => {
        const m = movieData[index];
        if (!m) return;
        try {
          const booking = JSON.parse(localStorage.getItem('hal_booking') || '{}');
          booking.movieId    = m.id;
          booking.movieTitle = m.title;
          booking.poster     = m.poster || '';
          booking.category   = m.category || '';
          localStorage.setItem('hal_booking', JSON.stringify(booking));
        } catch { /* ignore */ }
        window.location.href = `/movies/${m.id}`;
      });
    });

    function rotate(dir: 'n' | 'p') {
      currdeg += dir === 'n' ? -step : step;
      carousel!.style.transform = `rotateY(${currdeg}deg)`;
      updateItems();
    }

    updateItems();

    const nextHandler = () => rotate('n');
    const prevHandler = () => rotate('p');
    nextBtn.addEventListener('click', nextHandler);
    prevBtn.addEventListener('click', prevHandler);
    const timer = setInterval(() => rotate('n'), 4000);

    return () => {
      nextBtn.removeEventListener('click', nextHandler);
      prevBtn.removeEventListener('click', prevHandler);
      clearInterval(timer);
    };
  }, [movies, hasInfoPanel]);

  const carouselItems = letters.map(l => <div key={l} className={`item ${l}`} />);

  return (
    <div className="carousel-wrapper" ref={wrapperRef}>
      {hasInfoPanel ? (
        <div className="carousel-inner container-row">
          <div className="carousel-info card" aria-live="polite">
            <div className="card__tag carousel__badge">Category</div>
            <h3 className="card__title">映画タイトル</h3>
            <p className="card__short">映画の概要がここに表示されます。</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '14px' }}>
              <a className="btn btn--solid carousel-reserve-link" href="/reserve" style={{ flex: 1, fontSize: '12px', padding: '10px 14px' }}>今すぐ予約</a>
              <a className="btn carousel-detail-link" href="/movies" style={{ flex: 1, fontSize: '12px', padding: '10px 14px' }}>詳細を見る</a>
            </div>
          </div>
          <div className="container">
            <div className="carousel">{carouselItems}</div>
          </div>
        </div>
      ) : (
        <div className="container">
          <div className="carousel">{carouselItems}</div>
        </div>
      )}
      <div className="next">Next</div>
      <div className="prev">Prev</div>
    </div>
  );
}
