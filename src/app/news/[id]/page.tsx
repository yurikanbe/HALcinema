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
  const idx  = news.findIndex(n => n.id === id);
  if (idx === -1) notFound();
  const item = news[idx];
  const prev = idx < news.length - 1 ? news[idx + 1] : null;
  const next = idx > 0               ? news[idx - 1] : null;

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

        <div className={s.articleHeader}>
          <div className={s.articleMeta}>
            <span className={`${shared.newsBadge} ${BADGE_CLASS[item.category] ?? ''}`}>
              {CATEGORY_LABEL[item.category]}
            </span>
            <span className={s.date}>{dateStr}</span>
          </div>
          <h1 className={s.title}>{item.title}</h1>
        </div>

        <div className={s.body}>
          {paragraphs.map((p, i) => (
            <p key={i} className={s.bodyP}>{p}</p>
          ))}
        </div>

        {/* ── Prev / Next ── */}
        <div className={s.prevNext}>
          <div className={s.prevNextItem}>
            {prev && (
              <Link href={`/news/${prev.id}`} className={s.prevNextCard}>
                <span className={s.prevNextDir}>← 前の記事</span>
                <span className={`${shared.newsBadge} ${BADGE_CLASS[prev.category] ?? ''}`}>
                  {CATEGORY_LABEL[prev.category]}
                </span>
                <span className={s.prevNextTitle}>{prev.title}</span>
              </Link>
            )}
          </div>
          <div className={`${s.prevNextItem} ${s.prevNextItemRight}`}>
            {next && (
              <Link href={`/news/${next.id}`} className={`${s.prevNextCard} ${s.prevNextCardRight}`}>
                <span className={s.prevNextDir}>次の記事 →</span>
                <span className={`${shared.newsBadge} ${BADGE_CLASS[next.category] ?? ''}`}>
                  {CATEGORY_LABEL[next.category]}
                </span>
                <span className={s.prevNextTitle}>{next.title}</span>
              </Link>
            )}
          </div>
        </div>

        <div className={s.footer}>
          <Link href="/news" className={shared.textLink}>← お知らせ一覧に戻る</Link>
        </div>
      </div>
    </section>
  );
}
