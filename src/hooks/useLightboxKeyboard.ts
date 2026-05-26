import { useEffect, useRef } from 'react';

interface Options {
  isOpen: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function useLightboxKeyboard({ isOpen, onClose, onPrev, onNext }: Options): void {
  const closeRef = useRef(onClose);
  const prevRef  = useRef(onPrev);
  const nextRef  = useRef(onNext);
  closeRef.current = onClose;
  prevRef.current  = onPrev;
  nextRef.current  = onNext;

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')               closeRef.current();
      if (e.key === 'ArrowLeft'  && prevRef.current) prevRef.current();
      if (e.key === 'ArrowRight' && nextRef.current) nextRef.current();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [isOpen]);
}
