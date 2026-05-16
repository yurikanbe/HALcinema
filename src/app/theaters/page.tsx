'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import theatersData from '@/data/theaters.json';
import schedulesData from '@/data/schedules.json';
import moviesData from '@/data/movies.json';
import type { Theater, ScreenSchedule, Movie } from '@/types';

const theaters  = theatersData  as Theater[];
const schedules = schedulesData as ScreenSchedule[];
const movies    = moviesData    as Movie[];

function getMoviesForTheater(theaterId: string): Movie[] {
  const ids = new Set<string>();
  for (const s of schedules) {
    if (s.theaterId !== theaterId) continue;
    for (const sh of s.shows) ids.add(sh.movieId);
  }
  return movies.filter(m => ids.has(m.id));
}

function getFirstScreenShows(theaterId: string) {
  return schedules.find(s => s.theaterId === theaterId)?.shows ?? [];
}

export default function TheatersPage() {
  const [lb, setLb] = useState<{ theater: string; index: number } | null>(null);
  const chaptersRef = useRef<HTMLElement[]>([]);
  const [activeId, setActiveId] = useState('starry');

  useEffect(() => { document.title = 'HAL CINEMA | シアター'; }, []);

  // IntersectionObserver for local nav active state
  useEffect(() => {
    const elements = chaptersRef.current.filter(Boolean);
    if (!elements.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActiveId((entry.target as HTMLElement).id);
      });
    }, { rootMargin: '-38% 0px -38% 0px', threshold: 0 });
    elements.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Hash scroll on mount
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (['starry', 'abyss', 'cyber'].includes(hash)) {
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 140);
    }
  }, []);

  // Lightbox keyboard nav
  useEffect(() => {
    if (!lb) return;
    const theater = theaters.find(t => t.id === lb.theater);
    if (!theater) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLb(null);
      if (e.key === 'ArrowLeft')  setLb(p => p ? { ...p, index: (p.index - 1 + theater.gallery.length) % theater.gallery.length } : p);
      if (e.key === 'ArrowRight') setLb(p => p ? { ...p, index: (p.index + 1) % theater.gallery.length } : p);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [lb]);

  const currentGallery = lb ? theaters.find(t => t.id === lb.theater)?.gallery ?? [] : [];
  const currentPhoto   = lb ? currentGallery[lb.index] : null;

  return (
    <>
      {/* ── Page Intro ── */}
      <div className="theaters-intro">
        <div className="section__hint">Theater Collection</div>
        <h1 className="theaters-intro__title">星と深海、そして静寂</h1>
        <p className="theaters-intro__lead">
          Starry / Abyss / Cyber — 3つのコンセプト空間。<br />
          上方投影とリクライニングシートで、空間ごとに異なる世界観をご用意しています。
        </p>
      </div>

      {/* ── Local Nav ── */}
      <nav className="theater-local-nav" aria-label="シアター選択">
        <div className="theater-local-nav__inner">
          {theaters.map(t => (
            <a
              key={t.id}
              className={`theater-nav-btn${activeId === t.id ? ' is-active' : ''}`}
              href={`#${t.id}`}
            >
              <span className={`theater-nav-dot theater-nav-dot--${t.id}`}></span>
              {t.name}
            </a>
          ))}
        </div>
      </nav>

      {/* ── Theater Sections ── */}
      {theaters.map((theater, ti) => {
        const theaterMovies = getMoviesForTheater(theater.id);
        const firstScreen   = schedules.find(s => s.theaterId === theater.id);
        const screenShows   = firstScreen?.shows ?? [];

        return (
          <div key={theater.id}>
            <section
              className="theater-chapter"
              id={theater.id}
              ref={el => { if (el) chaptersRef.current[ti] = el; }}
            >
              {/* Hero */}
              <div className={`theater-chapter__hero theater-chapter__hero--${theater.id}`}>
                <div className="theater-chapter__hero-content">
                  <div className="theater-chapter__eyebrow">{theater.name}</div>
                  <h2 className="theater-chapter__title">{theater.tagline}</h2>
                  <p className="theater-chapter__tagline">{theater.concept}</p>
                  <div className="theater-chapter__chips">
                    {theater.features.map(f => (
                      <span key={f} className="theater-chapter__chip">{f}</span>
                    ))}
                  </div>
                  <Link href={`/schedule?theater=${theater.id}`} className="theater-chapter__btn">
                    このシアターの全上映を見る →
                  </Link>
                </div>
              </div>

              {/* Gallery */}
              <div className="theater-gallery theater-gallery--photo">
                {theater.gallery.map((photo, pi) => (
                  <div
                    key={pi}
                    className="theater-gallery__photo"
                    style={{ backgroundImage: `url('${photo.src}')` }}
                    onClick={() => setLb({ theater: theater.id, index: pi })}
                    title="クリックで拡大"
                  />
                ))}
              </div>

              {/* Body */}
              <div className="theater-chapter__body">
                <div className="theater-chapter__desc-row">
                  <p className="theater-chapter__desc">{theater.description}</p>
                  <div className="theater-chapter__stats">
                    {theater.stats.map(stat => (
                      <div
                        key={stat.label}
                        className="lineup-stat"
                        style={stat.value.length > 3 ? { fontSize: '20px', letterSpacing: '0.04em' } : undefined}
                      >
                        {stat.value}<span>{stat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="theater-chapter__cols">
                  {/* Movies */}
                  <div>
                    <div className="theater-chapter__subhead">
                      <div className="section__hint">Now Showing</div>
                      <h3 className="section__title" style={{ fontSize: '22px' }}>上映中の作品</h3>
                    </div>
                    <div className="film-grid film-grid--theater">
                      {theaterMovies.map(m => (
                        <Link key={m.id} className="film-card film-card--portrait" href={`/movies/${m.id}`}>
                          <div className="film-card__poster" style={{ backgroundImage: `url('${m.poster}')` }}>
                            <div className="film-card__poster-overlay"></div>
                            <div className="film-card__badge">{m.category}</div>
                          </div>
                          <div className="film-card__body">
                            <div className="film-card__title">{m.title}</div>
                            <div className="film-card__footer">
                              <div className="film-card__meta">{m.formats.join('・')}</div>
                              <span className="film-card__cta">詳細 →</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Schedule card */}
                  <div>
                    <div className="theater-chapter__subhead">
                      <div className="section__hint">Today&apos;s Showtime</div>
                      <h3 className="section__title" style={{ fontSize: '22px' }}>本日の上映</h3>
                    </div>
                    <div className="theater-sched-card">
                      <div className="theater-sched-card__head">
                        <span className="theater-sched-card__name">{theater.name}</span>
                        <span className="theater-sched-card__screen">{firstScreen?.screen}</span>
                      </div>
                      <div className="theater-sched-card__slots">
                        {screenShows.map(show => (
                          show.taken ? (
                            <button key={show.start} className="time-btn taken">
                              <span className="time-btn__time">{show.start}</span>
                              <span className="time-btn__info">満席</span>
                            </button>
                          ) : (
                            <Link key={show.start} href="/reserve" className="time-btn" style={{ textDecoration: 'none' }}>
                              <span className="time-btn__time">{show.start}</span>
                              <span className="time-btn__info">{show.title.length > 10 ? show.title.slice(0, 10) + '…' : show.title} / 残席{show.seats}</span>
                            </Link>
                          )
                        ))}
                      </div>
                      <div className="theater-sched-card__footer">
                        <Link href="/schedule" className="text-link">全日程を見る →</Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {ti < theaters.length - 1 && <div className="theater-chapter-divider" />}
          </div>
        );
      })}

      {/* ── Seat Philosophy ── */}
      <section className="section">
        <div className="section__head">
          <div>
            <div className="section__hint">Seat Philosophy</div>
            <h2 className="section__title">座席体験の設計</h2>
          </div>
        </div>
        <div className="feature-tiles">
          <div className="feature-tile">
            <div className="feature-tile__badge">Recline</div>
            <h3 className="feature-tile__title">プラネタリウム姿勢</h3>
            <p className="feature-tile__desc">自然に上方を向く角度で、首や肩の負担を軽減。長時間でも疲れにくい設計。</p>
          </div>
          <div className="feature-tile">
            <div className="feature-tile__badge">Projection</div>
            <h3 className="feature-tile__title">上方投影</h3>
            <p className="feature-tile__desc">視界の中心を高く設定し、没入感を最大化。天井全体が映像に変わる。</p>
          </div>
          <div className="feature-tile">
            <div className="feature-tile__badge">Seat View</div>
            <h3 className="feature-tile__title">視点プレビュー</h3>
            <p className="feature-tile__desc">座席ごとの見え方を可視化して選択可能。理想の角度を事前に確認。</p>
          </div>
        </div>
      </section>

      {/* ── Lightbox ── */}
      {lb && currentPhoto && (
        <div
          className="th-lb is-open"
          onClick={e => { if (e.target === e.currentTarget) setLb(null); }}
        >
          <button className="th-lb__close" onClick={() => setLb(null)}>×</button>
          <button
            className="th-lb__prev"
            onClick={() => setLb(p => p ? { ...p, index: (p.index - 1 + currentGallery.length) % currentGallery.length } : p)}
          >&#8249;</button>
          <img className="th-lb__img" src={currentPhoto.src} alt={currentPhoto.caption} />
          <button
            className="th-lb__next"
            onClick={() => setLb(p => p ? { ...p, index: (p.index + 1) % currentGallery.length } : p)}
          >&#8250;</button>
          <div className="th-lb__caption">
            {currentPhoto.caption}&nbsp;&nbsp;{lb.index + 1} / {currentGallery.length}
          </div>
        </div>
      )}
    </>
  );
}
