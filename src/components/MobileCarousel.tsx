'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import shared from '@/styles/shared.module.css';
import s from './MobileCarousel.module.css';

/** 最小限のポスター情報（Movie / CarouselMovie 両方と互換） */
export interface MobileCarouselItem {
  id: string;
  title: string;
  category: string;
  poster: string;
  description?: string;
}

interface Props {
  movies: MobileCarouselItem[];
  /**
   * 'home'    : ポスター + ジャンル・タイトル・あらすじ・ボタン（ホームページ）
   * 'movies'  : ポスターのみ ダーク配色（映画一覧ヒーロー）
   * 'theater' : ポスター + タイトルのみ（シアターページ）
   */
  variant?: 'home' | 'movies' | 'theater';
}

const PEEK = 44;  // 左右チラ見えの幅 (px) — CSS GAP定数と一致させること
const GAP  = 8;   // スライド間隔 (px)
const DUR  = 380; // アニメーション時間 (ms) — CSS transition-duration と一致

export default function MobileCarousel({ movies, variant = 'movies' }: Props) {
  const M = movies.length;

  const [idx, setIdx]     = useState(0);
  const viewportRef       = useRef<HTMLDivElement>(null);
  const trackRef          = useRef<HTMLDivElement>(null);
  const busyRef           = useRef(false);
  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef        = useRef(true);
  const touchStartX       = useRef(0);
  const touchStartT       = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /* ── ResizeObserver: スライド幅を CSS カスタムプロパティとして設定 ── */
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const update = () => {
      const vw  = viewport.clientWidth;
      const sw  = Math.round(vw - PEEK * 2 - GAP * 2); // スライド幅
      const slot = sw + GAP;                             // 1スロット幅
      const baseTx = -(slot - PEEK);                    // 中央スライドを表示する初期 translateX
      viewport.style.setProperty('--mc-sw',      `${sw}px`);
      viewport.style.setProperty('--mc-slot',    `${slot}px`);
      viewport.style.setProperty('--mc-base-tx', `${baseTx}px`);
    };

    const ro = new ResizeObserver(update);
    ro.observe(viewport);
    update();
    return () => ro.disconnect();
  }, []);

  /* ── idx 変化後: トランジションなしでトラックを元位置にリセット ── */
  useEffect(() => {
    const track   = trackRef.current;
    const viewport = viewportRef.current;
    if (!track || !viewport) return;
    const baseTx = viewport.style.getPropertyValue('--mc-base-tx') || '-244px';
    track.style.transition = 'none';
    track.style.transform  = `translateX(${baseTx})`;
    busyRef.current = false;
  }, [idx]);

  /* ── スライドアニメーション本体 ── */
  const doNav = (dir: 1 | -1) => {
    if (busyRef.current) return;
    busyRef.current = true;

    const track   = trackRef.current;
    const viewport = viewportRef.current;
    if (!track || !viewport) { busyRef.current = false; return; }

    const slot   = parseFloat(viewport.style.getPropertyValue('--mc-slot')   || '288');
    const baseTx = parseFloat(viewport.style.getPropertyValue('--mc-base-tx') || '-244');

    // トランジションをかけてスライド
    track.style.transition = `transform ${DUR}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
    track.style.transform  = `translateX(${baseTx + dir * -slot}px)`;

    // アニメーション完了後に idx を更新（useEffect がリセットを行う）
    setTimeout(() => {
      if (mountedRef.current) {
        setIdx(prev => ((prev + dir + M) % M));
      }
    }, DUR);
  };

  /* ── 自動再生タイマー ── */
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => doNav(1), 4000);
  };

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nav = (dir: 1 | -1) => { doNav(dir); startTimer(); };

  /* ── タッチ操作 ── */
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartT.current = Date.now();
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dt = Date.now() - touchStartT.current;
    if (Math.abs(dx) > 40 || (Math.abs(dx) > 20 && dt < 250)) {
      nav(dx < 0 ? 1 : -1);
    }
  };

  const prevIdx = (idx - 1 + M) % M;
  const nextIdx = (idx + 1) % M;
  const movie   = movies[idx];
  const isDark  = variant === 'movies';

  return (
    <div className={`${s.root}${isDark ? ' ' + s.dark : ''}`}>

      {/* ── Poster viewport (overflow hidden でクリップ) ── */}
      <div
        ref={viewportRef}
        className={s.viewport}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/*
          トラック: [prev | curr | next]
          初期 transform = --mc-base-tx で curr が中央に表示される
          アニメーション時に transform を移動 → タイムアウト後 idx 更新 → useEffect でリセット
        */}
        <div ref={trackRef} className={s.track}>
          {/* Prev */}
          <div
            className={`${s.slide} ${s.slideSide}`}
            style={{ backgroundImage: `url('${movies[prevIdx].poster}')` }}
            onClick={() => nav(-1)}
            aria-hidden="true"
          />
          {/* Current (Link でクリック可) */}
          <Link
            className={s.slide}
            href={`/movies/${movie.id}`}
            style={{ backgroundImage: `url('${movie.poster}')` }}
          >
            <div className={s.shade} />
            <span className={s.badge}>{movie.category}</span>
          </Link>
          {/* Next */}
          <div
            className={`${s.slide} ${s.slideSide}`}
            style={{ backgroundImage: `url('${movies[nextIdx].poster}')` }}
            onClick={() => nav(1)}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className={s.nav}>
        <button className={s.arrow} onClick={() => nav(-1)} aria-label="前の作品">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className={s.progress}>
          <div className={s.progressFill} style={{ width: `${((idx + 1) / M) * 100}%` }} />
        </div>
        <span className={s.counter}>{idx + 1} / {M}</span>
        <button className={s.arrow} onClick={() => nav(1)} aria-label="次の作品">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* ── Theater: タイトルのみ ── */}
      {variant === 'theater' && (
        <p className={s.movieTitle}>{movie.title}</p>
      )}

      {/* ── Home: フル情報カード ── */}
      {variant === 'home' && (
        <div className={s.info}>
          <div className={s.tag}>{movie.category}</div>
          <h3 className={s.title}>{movie.title}</h3>
          <p className={s.desc}>
            {(movie.description ?? '').length > 110
              ? movie.description!.slice(0, 109) + '…'
              : (movie.description ?? '')}
          </p>
          <div className={s.btns}>
            <Link
              className={`${shared.btn} ${shared.btnSolid}`}
              href="/reserve"
              style={{ flex: 1, fontSize: '12px', padding: '10px 12px' }}
            >
              チケット購入について
            </Link>
            <Link
              className={shared.btn}
              href={`/movies/${movie.id}`}
              style={{ flex: 1, fontSize: '12px', padding: '10px 12px' }}
            >
              詳細を見る
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
