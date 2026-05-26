'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const t = setTimeout(() => {
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-reveal-init])')
      );
      if (!elements.length) return;

      elements.forEach(el => {
        el.setAttribute('data-reveal-init', '1');
        el.style.opacity = '0';
        el.style.transform = 'translateY(22px)';
        const d = el.dataset.delay ? Number(el.dataset.delay) * 0.13 : 0;
        el.style.transition = `opacity 0.7s ease ${d}s, transform 0.7s ease ${d}s`;
      });

      const io = new IntersectionObserver(
        entries => entries.forEach(e => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            el.style.opacity = '1';
            el.style.transform = 'none';
            io.unobserve(el);
          }
        }),
        { threshold: 0.07 }
      );

      elements.forEach(el => io.observe(el));
      return () => io.disconnect();
    }, 60);

    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
