'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import newsData from '@/data/news.json';
import type { NewsItem, NewsCategory } from '@/types';

const news = newsData as NewsItem[];
const CATEGORY_LABEL: Record<string, string> = {
  campaign: 'キャンペーン',
  event:    'イベント',
  info:     'お知らせ',
};

export default function NewsPage() {
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => { document.title = 'HAL CINEMA | お知らせ'; }, []);

  const featured = news.find(n => n.featured);
  const listItems = news.filter(n => !n.featured);

  const isVisible = (cat: string) => activeCategory === 'all' || cat === activeCategory;

  return (
    <>
      <section className="page-hero">
        <div className="section__hint">News &amp; Campaign</div>
        <h1 className="page-hero__title">お知らせ</h1>
        <p className="page-hero__lead">キャンペーン情報、イベント、施設に関するお知らせをお届けします。</p>
      </section>

      <section className="section" style={{ paddingTop: '16px' }}>
        <div className="news-filter" id="news-filter">
          {(['all', 'campaign', 'event', 'info'] as const).map(cat => (
            <button
              key={cat}
              className={`filter-btn${activeCategory === cat ? ' active' : ''}`}
              data-cat={cat}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'all' ? 'すべて' : CATEGORY_LABEL[cat]}
            </button>
          ))}
        </div>

        {/* Featured */}
        {featured && isVisible(featured.category) && (
          <Link className="news-featured" href={`/news/${featured.id}`} data-cat={featured.category}>
            <div className="news-featured__image" style={{ background: featured.imageGradient }}>
              <div style={{ padding: '32px', color: 'white' }}>
                <div className={`news-badge news-badge--${featured.category}`} style={{ marginBottom: '14px' }}>
                  {CATEGORY_LABEL[featured.category]}
                </div>
                <div style={{ fontSize: '24px', letterSpacing: '0.1em', marginBottom: '6px' }}>
                  {featured.title.replace(/【(.+?)】/, '').split('　')[0]}
                </div>
                <div style={{ fontSize: '13px', opacity: 0.8 }}>{featured.excerpt}</div>
              </div>
            </div>
            <div className="news-featured__body">
              <span className={`news-badge news-badge--${featured.category}`}>{CATEGORY_LABEL[featured.category]}</span>
              <div className="news-card__title" style={{ fontSize: '17px' }}>{featured.title}</div>
              <div className="news-card__date" style={{ marginTop: '6px' }}>
                {new Date(featured.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </Link>
        )}

        {/* News list */}
        <div className="news-list" id="news-list">
          {listItems.filter(n => isVisible(n.category)).map(n => (
            <Link key={n.id} className="news-card" href={`/news/${n.id}`} data-cat={n.category}>
              <div className="news-card__image" style={{ background: n.imageGradient }}></div>
              <div>
                <span className={`news-badge news-badge--${n.category}`}>{CATEGORY_LABEL[n.category]}</span>
                <div className="news-card__title">{n.title}</div>
                <div className="news-card__date">
                  {new Date(n.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
