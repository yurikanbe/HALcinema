'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './Nav.module.css';
import { NAV_LINKS } from '@/lib/navLinks';
import SearchModal from './SearchModal';

export default function Nav() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(p => !p);
      }
      if (e.key === 'Escape') setMenuOpen(false);
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

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

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
            <button
              className={`${styles.hamburger}${menuOpen ? ' ' + styles.hamburgerOpen : ''}`}
              onClick={() => setMenuOpen(p => !p)}
              aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'}
              aria-expanded={menuOpen}
            >
              <span className={styles.hamburgerBar} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div
          className={styles.mobileMenuBackdrop}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className={`${styles.mobileMenu}${menuOpen ? ' ' + styles.mobileMenuOpen : ''}`}
        aria-hidden={!menuOpen}
      >
        <nav className={styles.mobileMenuNav}>
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.mobileMenuLink}${pathname === href ? ' ' + styles.mobileMenuLinkActive : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
