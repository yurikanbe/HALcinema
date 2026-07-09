'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import styles from './Nav.module.css';
import shared from '@/styles/shared.module.css';
import { NAV_LINKS } from '@/lib/navLinks';
import SearchModal from './SearchModal';

export default function Nav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(p => !p);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 56);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () =>
      document.documentElement.style.setProperty('--nav-height', el.offsetHeight + 'px');
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <header
        ref={headerRef}
        className={`${styles.nav}${scrolled ? ' ' + styles.navScrolled : ''}`}
        data-nav
      >
        <div className={styles.navInner}>
          <Link className={styles.logo} href="/" aria-label="HAL CINEMA ホーム">
            <img className={styles.logoImage} src="/images/logo.png" alt="HAL CINEMA" />
          </Link>
          <nav className={styles.navLinks}>
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={pathname === href ? styles.navLinkActive : undefined}
              >
                {label}
              </Link>
            ))}
            <Link href="/mypage" className={pathname === '/mypage' ? styles.navLinkActive : undefined}>
              マイページ
            </Link>
            {process.env.NODE_ENV === 'development' && (
              <Link href="/dev" className={pathname === '/dev' ? styles.navLinkActive : undefined}>
                Dev
              </Link>
            )}
          </nav>
          <div className={styles.navCta}>
            <button
              className={styles.searchBtn}
              onClick={() => setSearchOpen(true)}
              aria-label="検索"
            >
              <div className={styles.search}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <span className={styles.searchBtnLabel}>検索</span>
              </div>
              
              <kbd className={styles.searchKbd}>Ctrl K</kbd>
            </button>
            {status === 'authenticated' && session?.user ? (
              <div className={styles.authArea}>
                <button
                  type="button"
                  className={styles.authLink}
                  onClick={() => signOut({ callbackUrl: '/' })}
                >
                  ログアウト
                </button>
              </div>
            ) : status === 'unauthenticated' ? (
              <Link href="/login" className={styles.authLink}>
                ログイン
              </Link>
            ) : null}
          </div>
        </div>
      </header>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
