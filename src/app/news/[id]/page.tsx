import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import newsData from '@/data/news.json';
import type { NewsItem } from '@/types';

const news = newsData as NewsItem[];
const CATEGORY_LABEL: Record<string, string> = {
  campaign: 'キャンペーン',
  event:    'イベント',
  info:     'お知らせ',
};

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
    <section className="section" style={{ paddingTop: '48px', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <Link href="/news" className="text-link" style={{ paddingRight: 0, fontSize: '11px' }}>← お知らせ一覧に戻る</Link>
        </div>

        {/* Hero image */}
        <div style={{
          height: '220px',
          borderRadius: '14px',
          background: item.imageGradient,
          marginBottom: '32px',
          border: '1px solid rgba(200,164,91,0.18)',
          boxShadow: '0 12px 40px rgba(6,13,31,0.22)',
        }} />

        <span className={`news-badge news-badge--${item.category}`} style={{ marginBottom: '16px', display: 'inline-block' }}>
          {CATEGORY_LABEL[item.category]}
        </span>

        <h1 style={{
          fontSize: 'clamp(20px, 4vw, 28px)',
          letterSpacing: '0.08em',
          lineHeight: '1.55',
          color: 'var(--ink-900)',
          marginBottom: '12px',
        }}>
          {item.title}
        </h1>

        <div style={{
          fontSize: '12px',
          letterSpacing: '0.1em',
          color: 'var(--ink-500)',
          marginBottom: '36px',
          fontFamily: '"Barlow Condensed", sans-serif',
        }}>
          {dateStr}
        </div>

        <div style={{
          borderTop: '1px solid rgba(200,164,91,0.18)',
          paddingTop: '32px',
        }}>
          {paragraphs.map((p, i) => (
            <p key={i} style={{
              fontSize: '15px',
              lineHeight: '2.0',
              color: '#2b3d5f',
              letterSpacing: '0.04em',
              marginBottom: '1.6em',
            }}>
              {p}
            </p>
          ))}
        </div>

        <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid rgba(200,164,91,0.14)' }}>
          <Link href="/news" className="text-link">← お知らせ一覧に戻る</Link>
        </div>
      </div>
    </section>
  );
}
