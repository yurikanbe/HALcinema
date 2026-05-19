import type { Metadata } from 'next';
import newsData from '@/data/news.json';
import type { NewsItem } from '@/types';
import shared from '@/styles/shared.module.css';
import NewsClient from './NewsClient';

export const metadata: Metadata = {
  title: 'HAL CINEMA | お知らせ',
};

const news = newsData as NewsItem[];

export default function NewsPage() {
  const featured  = news.find(n => n.featured);
  const listItems = news.filter(n => !n.featured);

  return (
    <>
      <section className={shared.pageHero}>
        <div className={shared.sectionHint}>News &amp; Campaign</div>
        <h1 className={shared.pageHeroTitle}>お知らせ</h1>
        <p className={shared.pageHeroLead}>キャンペーン情報、イベント、施設に関するお知らせをお届けします。</p>
      </section>

      <NewsClient featured={featured} listItems={listItems} />
    </>
  );
}
