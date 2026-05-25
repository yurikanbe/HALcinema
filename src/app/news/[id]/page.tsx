import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import newsData from '@/data/news.json';
import type { NewsItem } from '@/types';
import { CATEGORY_LABEL, BADGE_CLASS } from '@/lib/newsCategories';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

const news = newsData as NewsItem[];

export function generateStaticParams() {
  return news.map(n => ({ id: n.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = news.find(n => n.id === id);
  return { title: item ? `HAL CINEMA | ${item.title}` : 'HAL CINEMA' };
}

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = news.find(n => n.id === id);
  if (!item) notFound();

  const paragraphs = item.body.split('\n\n').filter(Boolean);
  const dateStr = new Date(item.date).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <section className={`${shared.section} ${s.sectionPt}`}>
      <div className={s.wrapper}>
        <div className={s.backLinkWrap}>
          <Link href="/news" className={`${shared.textLink} ${s.backLink}`}>← お知らせ一覧に戻る</Link>
        </div>

        <div className={s.heroImg} style={{ background: item.imageGradient }} />

        <span className={`${shared.newsBadge} ${BADGE_CLASS[item.category] ?? ''} ${s.badge}`}>
          {CATEGORY_LABEL[item.category]}
        </span>

        <h1 className={s.title}>{item.title}</h1>
        <div className={s.date}>{dateStr}</div>

        <div className={s.body}>
          {paragraphs.map((p, i) => (
            <p key={i} className={s.bodyP}>{p}</p>
          ))}
        </div>

        <div className={s.footer}>
          <Link href="/news" className={shared.textLink}>← お知らせ一覧に戻る</Link>
        </div>
      </div>
    </section>
  );
}
