'use client';

import { useBackToTop } from '@/hooks/useBackToTop';
import shared from '@/styles/shared.module.css';

export default function BackToTop({ threshold }: { threshold?: number }) {
  const show = useBackToTop(threshold);
  return (
    <button
      className={`${shared.backToTop}${show ? ' ' + shared.backToTopVisible : ''}`}
      aria-label="ページトップへ戻る"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}
