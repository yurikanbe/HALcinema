'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import newsData from '@/data/news.json';
import type { NewsItem } from '@/types';
import { CATEGORY_LABEL } from '@/lib/newsCategories';
import s from './AnnouncementBanner.module.css';

const news = newsData as NewsItem[];
const featured = news.find(n => n.featured);

const STORAGE_KEY = 'hal-banner-dismissed';

export default function AnnouncementBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!featured) return;
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (dismissed !== featured.id) setVisible(true);
  }, []);

  function dismiss() {
    if (featured) sessionStorage.setItem(STORAGE_KEY, featured.id);
    setVisible(false);
  }

  if (!featured || !visible) return null;

  return (
    <div className={s.banner} role="banner">
      <div className={s.inner}>
        <span className={s.badge}>{CATEGORY_LABEL[featured.category]}</span>
        <Link href={`/news/${featured.id}`} className={s.text} onClick={dismiss}>
          {featured.title}
        </Link>
        <Link href={`/news/${featured.id}`} className={s.cta} onClick={dismiss}>
          詳細 →
        </Link>
      </div>
      <button className={s.close} onClick={dismiss} aria-label="閉じる">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}
