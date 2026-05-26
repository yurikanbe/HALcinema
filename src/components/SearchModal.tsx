'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import moviesData from '@/data/movies.json';
import newsData   from '@/data/news.json';
import { MENU_ITEMS } from '@/lib/menuData';
import { FAQ_SEARCH_ITEMS } from '@/lib/faqData';
import type { Movie, NewsItem } from '@/types';
import s from './SearchModal.module.css';

const movies = moviesData as Movie[];
const news   = newsData   as NewsItem[];

type MovieDoc = Movie & { directorArr: string[] };

const movieDocs: MovieDoc[] = movies.map(m => ({
  ...m,
  directorArr: Array.isArray(m.director) ? m.director : m.director ? [m.director] : [],
}));

const NEWS_CATEGORY_LABEL: Record<string, string> = {
  campaign: 'キャンペーン',
  event:    'イベント',
  info:     'お知らせ',
};

/* ── Fuse indexes (built once at module load) ── */

const movieFuse = new Fuse(movieDocs, {
  keys: [
    { name: 'title',       weight: 3 },
    { name: 'cast',        weight: 2 },
    { name: 'directorArr', weight: 2 },
    { name: 'category',    weight: 1 },
    { name: 'description', weight: 0.5 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  includeMatches: true,
});

const newsFuse = new Fuse(news, {
  keys: [
    { name: 'title',   weight: 3 },
    { name: 'excerpt', weight: 2 },
    { name: 'body',    weight: 1 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
});

const faqFuse = new Fuse(FAQ_SEARCH_ITEMS, {
  keys: [
    { name: 'question', weight: 3 },
    { name: 'answer',   weight: 1 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
});

const menuFuse = new Fuse(MENU_ITEMS, {
  keys: [
    { name: 'title', weight: 3 },
    { name: 'tag',   weight: 2 },
    { name: 'desc',  weight: 0.5 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
});

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { document.body.style.overflow = ''; return; }
    setQuery('');
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => { clearTimeout(t); document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  const q = query.trim();

  const movieResults = useMemo(() => (q ? movieFuse.search(q, { limit: 5 }) : []), [q]);
  const newsResults  = useMemo(() => (q ? newsFuse.search(q,  { limit: 3 }) : []), [q]);
  const faqResults   = useMemo(() => (q ? faqFuse.search(q,   { limit: 3 }) : []), [q]);
  const menuResults  = useMemo(() => (q ? menuFuse.search(q,  { limit: 3 }) : []), [q]);

  const hasResults =
    movieResults.length > 0 || newsResults.length > 0 ||
    faqResults.length   > 0 || menuResults.length  > 0;

  if (!open) return null;

  return (
    <div
      className={s.overlay}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="サイト内検索"
    >
      <div className={s.panel}>
        {/* ── Input ── */}
        <div className={s.inputRow}>
          <svg className={s.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            className={s.input}
            placeholder="映画・キャスト・監督・ニュース・FAQ・メニューを検索..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button className={s.escBtn} onClick={onClose} aria-label="閉じる">ESC</button>
        </div>

        {/* ── Results ── */}
        <div className={s.results}>
          {!q && (
            <p className={s.hint}>
              映画タイトル、キャスト、監督名、<br />
              お知らせ、よくある質問、フード名などで検索できます
            </p>
          )}
          {q && !hasResults && (
            <p className={s.hint}>「{query}」の検索結果は見つかりませんでした</p>
          )}

          {/* ── 映画 ── */}
          {movieResults.length > 0 && (
            <div className={s.group}>
              <div className={s.groupHead}>映画</div>
              {movieResults.map(({ item, matches }) => {
                const castMatch = matches?.find(m => m.key === 'cast');
                const dirMatch  = matches?.find(m => m.key === 'directorArr');
                const hint = castMatch?.value
                  ? `出演: ${castMatch.value}`
                  : dirMatch?.value
                    ? `監督: ${dirMatch.value}`
                    : null;
                return (
                  <Link
                    key={item.id}
                    href={`/movies/${item.id}`}
                    className={s.movieResult}
                    onClick={onClose}
                  >
                    <div
                      className={s.movieThumb}
                      style={item.poster ? { backgroundImage: `url('${item.poster}')` } : {}}
                    />
                    <div className={s.movieInfo}>
                      <div className={s.movieCategory}>{item.category}</div>
                      <div className={s.movieTitle}>{item.title}</div>
                      {item.status === 'coming_soon' && (
                        <span className={s.comingSoon}>Coming Soon</span>
                      )}
                      {hint && <div className={s.movieHint}>{hint}</div>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* ── お知らせ ── */}
          {newsResults.length > 0 && (
            <div className={s.group}>
              <div className={s.groupHead}>お知らせ</div>
              {newsResults.map(({ item }) => (
                <Link
                  key={item.id}
                  href={`/news/${item.id}`}
                  className={s.newsResult}
                  onClick={onClose}
                >
                  <div className={s.newsInfo}>
                    <div className={s.newsMeta}>
                      <span className={s.newsCategory}>
                        {NEWS_CATEGORY_LABEL[item.category] ?? item.category}
                      </span>
                      <span className={s.newsDate}>{item.date}</span>
                    </div>
                    <div className={s.newsTitle}>{item.title}</div>
                    <div className={s.newsExcerpt}>{item.excerpt}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* ── FAQ ── */}
          {faqResults.length > 0 && (
            <div className={s.group}>
              <div className={s.groupHead}>よくある質問</div>
              {faqResults.map(({ item }) => (
                <Link
                  key={item.id}
                  href="/faq"
                  className={s.faqResult}
                  onClick={onClose}
                >
                  <span className={s.faqCategory}>{item.categoryLabel}</span>
                  <div className={s.faqQuestion}>{item.question}</div>
                </Link>
              ))}
            </div>
          )}

          {/* ── フード＆ドリンク ── */}
          {menuResults.length > 0 && (
            <div className={s.group}>
              <div className={s.groupHead}>フード＆ドリンク</div>
              {menuResults.map(({ item }) => (
                <Link
                  key={item.id}
                  href={`/menu#${item.id}`}
                  className={s.menuResult}
                  onClick={onClose}
                >
                  <span className={s.menuTag}>{item.tag}</span>
                  <div className={s.menuInfo}>
                    <div className={s.menuTitle}>{item.title}</div>
                    <div className={s.menuDesc}>{item.desc.split('\n\n')[0]}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
