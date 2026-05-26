'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import theatersData from '@/data/theaters.json';
import schedulesData from '@/data/schedules.json';
import moviesData from '@/data/movies.json';
import type { Theater, ScreenSchedule, Movie } from '@/types';
import { useLightboxKeyboard } from '@/hooks/useLightboxKeyboard';
import { THEATER_CONFIG } from '@/lib/theaterConfig';
import BackToTop from '@/components/BackToTop';
import ZoomableImage from '@/components/ZoomableImage';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

const theaters  = theatersData  as Theater[];
const schedules = schedulesData as ScreenSchedule[];
const movies    = moviesData    as Movie[];

function getMoviesForTheater(theaterId: string): Movie[] {
  return movies.filter(m => m.theaters.includes(theaterId));
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
  const [lb, setLb] = useState<{ images: { src: string; caption: string }[]; index: number } | null>(null);
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

  useLightboxKeyboard({
    isOpen: lb !== null,
    onClose: () => setLb(null),
    onPrev:  () => setLb(p => p ? { ...p, index: (p.index - 1 + p.images.length) % p.images.length } : p),
    onNext:  () => setLb(p => p ? { ...p, index: (p.index + 1) % p.images.length } : p),
  });

  const currentImages = lb?.images ?? [];
  const currentPhoto  = lb ? currentImages[lb.index] : null;

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
              <div
                className={`${s.theaterChapterHero} ${HERO_CLASS[theater.id] ?? ''} ${s.theaterChapterHeroClickable}`}
                onClick={() => {
                  const cfg = THEATER_CONFIG[theater.id as keyof typeof THEATER_CONFIG];
                  const hero = cfg ? { src: cfg.heroImage, caption: cfg.heroCaption } : null;
                  setLb({ images: hero ? [hero, ...theater.gallery] : theater.gallery, index: 0 });
                }}
              >
                <div className={s.theaterHeroZoom} aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                </div>
                <div className={s.theaterChapterHeroContent} onClick={e => e.stopPropagation()}>
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
                    onClick={() => setLb({ images: theater.gallery, index: pi })}
                    title="クリックで拡大"
                  />
                ))}
              </div>

              {/* Body */}
              <div className={s.theaterChapterBody}>
                {/* Seat layout */}
                <div className={s.seatLayoutSection}>
                  <div className={s.theaterChapterSubhead}>
                    <div className={shared.sectionHint}>Seat Layout</div>
                    <h3 className={shared.sectionTitle} style={{ fontSize: '22px' }}>座席レイアウト</h3>
                  </div>
                  <div className={s.seatLayoutGrid}>
                    <div className={s.seatLayoutImgWrap}>
                      <ZoomableImage
                        src={`/images/${theater.id}/seatmap.png`}
                        alt={`${theater.name} 座席レイアウト`}
                        className={s.seatLayoutImg}
                      />
                    </div>
                    <div className={s.seatLayoutInfo}>
                      <p className={s.seatLayoutDesc}>{theater.description}</p>
                      <div className={s.seatLayoutStats}>
                        {theater.stats.map(stat => (
                          <div key={stat.label} className={s.seatLayoutStat}>
                            <span className={s.seatLayoutStatValue}>{stat.value}</span>
                            <span className={s.seatLayoutStatLabel}>{stat.label}</span>
                          </div>
                        ))}
                      </div>
                      <div className={s.seatLayoutFeatures}>
                        {theater.features.map(f => (
                          <span key={f} className={s.seatLayoutFeatureChip}>{f}</span>
                        ))}
                      </div>
                    </div>
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
                              <div className={shared.filmCardMeta}>{m.formats?.join('・') ?? '—'}</div>
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
          <Link className={shared.textLink} href="/faq">よくある質問 →</Link>
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
            onClick={() => setLb(p => p ? { ...p, index: (p.index - 1 + currentImages.length) % currentImages.length } : p)}
          >&#8249;</button>
          <img className={s.thLbImg} src={currentPhoto.src} alt={currentPhoto.caption} />
          <button
            className={s.thLbNext}
            onClick={() => setLb(p => p ? { ...p, index: (p.index + 1) % currentImages.length } : p)}
          >&#8250;</button>
          <div className={s.thLbCaption}>
            {currentPhoto.caption}&nbsp;&nbsp;{lb.index + 1} / {currentImages.length}
          </div>
        </div>
      )}

      <BackToTop />
    </>
  );
}
