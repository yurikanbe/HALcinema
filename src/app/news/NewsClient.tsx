'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { NewsItem } from '@/types';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

const CATEGORY_LABEL: Record<string, string> = {
  campaign: 'キャンペーン',
  event:    'イベント',
  info:     'お知らせ',
};

const BADGE_CLASS: Record<string, string> = {
  campaign: shared.newsBadgeCampaign,
  event:    shared.newsBadgeEvent,
  info:     shared.newsBadgeInfo,
};

interface Props {
  featured: NewsItem | undefined;
  listItems: NewsItem[];
}

export default function NewsClient({ featured, listItems }: Props) {
  const [activeCategory, setActiveCategory] = useState('all');

  const isVisible = (cat: string) => activeCategory === 'all' || cat === activeCategory;

  return (
    <section className={`${shared.section} ${s.sectionPt}`}>
      <div className={shared.newsFilter} id="news-filter">
        {(['all', 'campaign', 'event', 'info'] as const).map(cat => (
          <button
            key={cat}
            className={`${shared.filterBtn}${activeCategory === cat ? ' ' + shared.filterBtnActive : ''}`}
            data-cat={cat}
            onClick={() => setActiveCategory(cat)}
          >
            {cat === 'all' ? 'すべて' : CATEGORY_LABEL[cat]}
          </button>
        ))}
      </div>

      {/* Featured */}
      {featured && isVisible(featured.category) && (
        <Link className={shared.newsFeatured} href={`/news/${featured.id}`} data-cat={featured.category}>
          <div className={shared.newsFeaturedImage} style={{ background: featured.imageGradient }}>
            <div className={shared.newsFeaturedImageInner}>
              <div className={`${shared.newsBadge} ${BADGE_CLASS[featured.category] ?? ''}`} style={{ marginBottom: '14px' }}>
                {CATEGORY_LABEL[featured.category]}
              </div>
              <div className={shared.newsFeaturedImageTitle}>
                {featured.title.replace(/【(.+?)】/, '').split('　')[0]}
              </div>
              <div className={shared.newsFeaturedImageExcerpt}>{featured.excerpt}</div>
            </div>
          </div>
          <div className={shared.newsFeaturedBody}>
            <span className={`${shared.newsBadge} ${BADGE_CLASS[featured.category] ?? ''}`}>{CATEGORY_LABEL[featured.category]}</span>
            <div className={shared.newsFeaturedTitle}>{featured.title}</div>
            <div className={shared.newsFeaturedDate}>
              {new Date(featured.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </Link>
      )}

      {/* News list */}
      <div className={shared.newsList} id="news-list">
        {listItems.filter(n => isVisible(n.category)).map(n => (
          <Link key={n.id} className={shared.newsCard} href={`/news/${n.id}`} data-cat={n.category}>
            <div className={shared.newsCardImage} style={{ background: n.imageGradient }}></div>
            <div>
              <span className={`${shared.newsBadge} ${BADGE_CLASS[n.category] ?? ''}`}>{CATEGORY_LABEL[n.category]}</span>
              <div className={shared.newsCardTitle}>{n.title}</div>
              <div className={shared.newsCardDate}>
                {new Date(n.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
