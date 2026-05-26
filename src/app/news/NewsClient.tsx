'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { NewsItem } from '@/types';
import { CATEGORY_LABEL, BADGE_CLASS } from '@/lib/newsCategories';
import FilterButtonGroup from '@/components/FilterButtonGroup';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

interface Props {
  featured: NewsItem | undefined;
  listItems: NewsItem[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function NewsClient({ featured, listItems }: Props) {
  const [activeCategory, setActiveCategory] = useState('all');

  const isVisible = (cat: string) => activeCategory === 'all' || cat === activeCategory;

  return (
    <section className={`${shared.section} ${s.sectionPt}`}>
      <FilterButtonGroup
        options={(['all', 'campaign', 'event', 'info'] as const).map(cat => ({
          value: cat,
          label: cat === 'all' ? 'すべて' : CATEGORY_LABEL[cat],
        }))}
        active={activeCategory}
        onChange={setActiveCategory}
        className={shared.newsFilter}
        id="news-filter"
      />

      {/* Featured */}
      {featured && isVisible(featured.category) && (
        <Link className={shared.newsFeatured} href={`/news/${featured.id}`}>
          <div className={shared.newsFeaturedLeft}>
            <span className={`${shared.newsBadge} ${BADGE_CLASS[featured.category] ?? ''}`}>
              {CATEGORY_LABEL[featured.category]}
            </span>
            <div className={shared.newsFeaturedTitle}>{featured.title}</div>
            <div className={shared.newsFeaturedDate}>{formatDate(featured.date)}</div>
          </div>
          <div className={shared.newsFeaturedBody}>
            <p className={shared.newsFeaturedExcerpt}>{featured.excerpt}</p>
            <span className={shared.newsFeaturedCta}>続きを読む →</span>
          </div>
        </Link>
      )}

      {/* News list */}
      <div className={shared.newsList} id="news-list">
        {listItems.filter(n => isVisible(n.category)).map(n => (
          <Link key={n.id} className={shared.newsCard} href={`/news/${n.id}`}>
            <span className={`${shared.newsBadge} ${BADGE_CLASS[n.category] ?? ''}`}>
              {CATEGORY_LABEL[n.category]}
            </span>
            <div className={shared.newsCardTitle}>{n.title}</div>
            <div className={shared.newsCardDate}>{formatDate(n.date)}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
