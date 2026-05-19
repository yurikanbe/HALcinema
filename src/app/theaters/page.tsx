'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import theatersData from '@/data/theaters.json';
import schedulesData from '@/data/schedules.json';
import moviesData from '@/data/movies.json';
import type { Theater, ScreenSchedule, Movie } from '@/types';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

const theaters  = theatersData  as Theater[];
const schedules = schedulesData as ScreenSchedule[];
const movies    = moviesData    as Movie[];

function getMoviesForTheater(theaterId: string): Movie[] {
  const ids = new Set<string>();
  for (const sc of schedules) {
    if (sc.theaterId !== theaterId) continue;
    for (const sh of sc.shows) ids.add(sh.movieId);
  }
  return movies.filter(m => ids.has(m.id));
}

const NAV_DOT_CLASS: Record<string, string> = {
  starry: s.theaterNavDotStarry,
  abyss:  s.theaterNavDotAbyss,
  cyber:  s.theaterNavDotCyber,
};
const HERO_CLASS: Record<string, string> = {
  starry: s.theaterChapterHeroStarry,
  abyss:  s.theaterChapterHeroAbyss,
  cyber:  s.theaterChapterHeroCyber,
};

export default function TheatersPage() {
  const [lb, setLb] = useState<{ theater: string; index: number } | null>(null);
  const chaptersRef = useRef<HTMLElement[]>([]);
  const [activeId, setActiveId] = useState('starry');

  useEffect(() => { document.title = 'HAL CINEMA | シアター'; }, []);

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

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (['starry', 'abyss', 'cyber'].includes(hash)) {
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 140);
    }
  }, []);

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
      <div className={s.theatersIntro}>
        <div className={shared.sectionHint}>Theater Collection</div>
        <h1 className={s.theatersIntroTitle}>星と深海、そして静寂</h1>
        <p className={s.theatersIntroLead}>
          Starry / Abyss / Cyber — 3つのコンセプト空間。<br />
          上方投影とリクライニングシートで、空間ごとに異なる世界観をご用意しています。
        </p>
      </div>

      {/* ── Local Nav ── */}
      <nav className={s.theaterLocalNav} aria-label="シアター選択">
        <div className={s.theaterLocalNavInner}>
          {theaters.map(t => (
            <a
              key={t.id}
              className={`${s.theaterNavBtn}${activeId === t.id ? ' ' + s.theaterNavBtnActive : ''}`}
              href={`#${t.id}`}
            >
              <span className={`${s.theaterNavDot} ${NAV_DOT_CLASS[t.id] ?? ''}`}></span>
              {t.name}
            </a>
          ))}
        </div>
      </nav>

      {/* ── Theater Sections ── */}
      {theaters.map((theater, ti) => {
        const theaterMovies = getMoviesForTheater(theater.id);
        const firstScreen   = schedules.find(sc => sc.theaterId === theater.id);
        const screenShows   = firstScreen?.shows ?? [];

        return (
          <div key={theater.id}>
            <section
              className={s.theaterChapter}
              id={theater.id}
              ref={el => { if (el) chaptersRef.current[ti] = el; }}
            >
              {/* Hero */}
              <div className={`${s.theaterChapterHero} ${HERO_CLASS[theater.id] ?? ''}`}>
                <div className={s.theaterChapterHeroContent}>
                  <div className={s.theaterChapterEyebrow}>{theater.name}</div>
                  <h2 className={s.theaterChapterTitle}>{theater.tagline}</h2>
                  <p className={s.theaterChapterTagline}>{theater.concept}</p>
                  <div className={s.theaterChapterChips}>
                    {theater.features.map(f => (
                      <span key={f} className={s.theaterChapterChip}>{f}</span>
                    ))}
                  </div>
                  <Link href={`/schedule?theater=${theater.id}`} className={s.theaterChapterBtn}>
                    このシアターの全上映を見る →
                  </Link>
                </div>
              </div>

              {/* Gallery */}
              <div className={`${s.theaterGallery} ${s.theaterGalleryPhoto}`}>
                {theater.gallery.map((photo, pi) => (
                  <div
                    key={pi}
                    className={s.theaterGalleryPhotoItem}
                    style={{ backgroundImage: `url('${photo.src}')` }}
                    onClick={() => setLb({ theater: theater.id, index: pi })}
                    title="クリックで拡大"
                  />
                ))}
              </div>

              {/* Body */}
              <div className={s.theaterChapterBody}>
                <div className={s.theaterChapterDescRow}>
                  <p className={s.theaterChapterDesc}>{theater.description}</p>
                  <div className={s.theaterChapterStats}>
                    {theater.stats.map(stat => (
                      <div
                        key={stat.label}
                        className={shared.lineupStat}
                        style={stat.value.length > 3 ? { fontSize: '20px', letterSpacing: '0.04em' } : undefined}
                      >
                        {stat.value}<span>{stat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={s.theaterChapterCols}>
                  {/* Movies */}
                  <div>
                    <div className={s.theaterChapterSubhead}>
                      <div className={shared.sectionHint}>Now Showing</div>
                      <h3 className={shared.sectionTitle} style={{ fontSize: '22px' }}>上映中の作品</h3>
                    </div>
                    <div className={`${shared.filmGrid} ${shared.filmGridTheater}`}>
                      {theaterMovies.map(m => (
                        <Link key={m.id} className={`${shared.filmCard} ${shared.filmCardPortrait}`} href={`/movies/${m.id}`}>
                          <div className={shared.filmCardPoster} style={{ backgroundImage: `url('${m.poster}')` }}>
                            <div className={shared.filmCardPosterOverlay}></div>
                            <div className={shared.filmCardBadge}>{m.category}</div>
                          </div>
                          <div className={shared.filmCardBody}>
                            <div className={shared.filmCardTitle}>{m.title}</div>
                            <div className={shared.filmCardFooter}>
                              <div className={shared.filmCardMeta}>{m.formats.join('・')}</div>
                              <span className={shared.filmCardCta}>詳細 →</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Schedule card */}
                  <div>
                    <div className={s.theaterChapterSubhead}>
                      <div className={shared.sectionHint}>Today&apos;s Showtime</div>
                      <h3 className={shared.sectionTitle} style={{ fontSize: '22px' }}>本日の上映</h3>
                    </div>
                    <div className={s.theaterSchedCard}>
                      <div className={s.theaterSchedCardHead}>
                        <span className={s.theaterSchedCardName}>{theater.name}</span>
                        <span className={s.theaterSchedCardScreen}>{firstScreen?.screen}</span>
                      </div>
                      <div className={s.theaterSchedCardSlots}>
                        {screenShows.map(show => (
                          show.taken ? (
                            <button key={show.start} className={`${shared.timeBtn} ${shared.timeBtnTaken}`}>
                              <span className={shared.timeBtnTime}>{show.start}</span>
                              <span className={shared.timeBtnInfo}>満席</span>
                            </button>
                          ) : (
                            <Link key={show.start} href="/reserve" className={shared.timeBtn}>
                              <span className={shared.timeBtnTime}>{show.start}</span>
                              <span className={shared.timeBtnInfo}>{show.title.length > 10 ? show.title.slice(0, 10) + '…' : show.title} / 残席{show.seats}</span>
                            </Link>
                          )
                        ))}
                      </div>
                      <div className={s.theaterSchedCardFooter}>
                        <Link href="/schedule" className={shared.textLink}>全日程を見る →</Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {ti < theaters.length - 1 && <div className={s.theaterChapterDivider} />}
          </div>
        );
      })}

      {/* ── Seat Philosophy ── */}
      <section className={shared.section}>
        <div className={shared.sectionHead}>
          <div>
            <div className={shared.sectionHint}>Seat Philosophy</div>
            <h2 className={shared.sectionTitle}>座席の設計</h2>
          </div>
        </div>
        <div className={shared.featureTiles}>
          <div className={shared.featureTile}>
            <div className={shared.featureTileBadge}>Recline</div>
            <h3 className={shared.featureTileTitle}>リクライニング</h3>
            <p className={shared.featureTileDesc}>自然に上方を向く角度で、首や肩の負担を軽減。<br />長時間でも疲れにくい設計。</p>
          </div>
          <div className={shared.featureTile}>
            <div className={shared.featureTileBadge}>Projection</div>
            <h3 className={shared.featureTileTitle}>上方投影</h3>
            <p className={shared.featureTileDesc}>視界の中心を高く設定し、没入感を最大化。<br />天井全体が映像に変わる。</p>
          </div>
          <div className={shared.featureTile}>
            <div className={shared.featureTileBadge}>Seat View</div>
            <h3 className={shared.featureTileTitle}>視点プレビュー</h3>
            <p className={shared.featureTileDesc}>座席ごとの見え方を可視化して選択可能。<br />理想の角度を事前に確認。</p>
          </div>
        </div>
      </section>

      {/* ── Lightbox ── */}
      {lb && currentPhoto && (
        <div
          className={`${s.thLb} ${s.thLbOpen}`}
          onClick={e => { if (e.target === e.currentTarget) setLb(null); }}
        >
          <button className={s.thLbClose} onClick={() => setLb(null)}>×</button>
          <button
            className={s.thLbPrev}
            onClick={() => setLb(p => p ? { ...p, index: (p.index - 1 + currentGallery.length) % currentGallery.length } : p)}
          >&#8249;</button>
          <img className={s.thLbImg} src={currentPhoto.src} alt={currentPhoto.caption} />
          <button
            className={s.thLbNext}
            onClick={() => setLb(p => p ? { ...p, index: (p.index + 1) % currentGallery.length } : p)}
          >&#8250;</button>
          <div className={s.thLbCaption}>
            {currentPhoto.caption}&nbsp;&nbsp;{lb.index + 1} / {currentGallery.length}
          </div>
        </div>
      )}
    </>
  );
}
