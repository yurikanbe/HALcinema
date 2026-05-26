'use client';

import { useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import s from './ZoomableImage.module.css';

interface Props {
  src: string;
  alt: string;
  className?: string;
  children?: ReactNode;
}

export default function ZoomableImage({ src, alt, className, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = useCallback(() => {
    document.body.style.overflow = 'hidden';
    dialogRef.current?.showModal();
  }, []);

  const close = useCallback(() => {
    document.body.style.overflow = '';
    dialogRef.current?.close();
  }, []);

  return (
    <>
      <button
        type="button"
        className={s.trigger}
        onClick={open}
        aria-label={`${alt}を拡大表示`}
      >
        <img src={src} alt={alt} className={className} />
        {children}
        <span className={s.zoomHint} aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
            <path d="M11 8v6M8 11h6"/>
          </svg>
        </span>
      </button>
      <dialog
        ref={dialogRef}
        className={s.dialog}
        onClick={(e) => { if (e.target === dialogRef.current) close(); }}
        onCancel={close}
      >
        <img src={src} alt={alt} className={s.dialogImg} />
        <button
          type="button"
          className={s.closeBtn}
          onClick={close}
          aria-label="閉じる"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </dialog>
    </>
  );
}
