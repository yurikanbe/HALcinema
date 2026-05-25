'use client';

import { useState, useEffect } from 'react';
import s from './PosterLightbox.module.css';

interface PosterLightboxProps {
  posterUrl: string;
  title: string;
  posterClassName: string;
  style?: React.CSSProperties;
}

export default function PosterLightbox({ posterUrl, title, posterClassName, style }: PosterLightboxProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <div
        className={`${posterClassName} ${s.posterThumb}`}
        style={style}
        onClick={() => setOpen(true)}
        title="クリックで拡大"
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(true); }}
        aria-label={`${title}のポスターを拡大表示`}
      >
        <div className={s.zoomHint} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </div>
      </div>

      {open && (
        <div
          className={s.overlay}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="ポスター拡大表示"
        >
          <button className={s.close} onClick={() => setOpen(false)} aria-label="閉じる">×</button>
          <img
            className={s.img}
            src={posterUrl}
            alt={`${title}のポスター`}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
