'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './Nav.module.css';
import shared from '@/styles/shared.module.css';

const NAV_LINKS = [
  { href: '/', label: 'ホーム' },
  { href: '/movies', label: '作品一覧' },
  { href: '/schedule', label: '上映スケジュール' },
  { href: '/theaters', label: 'シアター' },
  { href: '/news', label: 'お知らせ' },
  { href: '/faq', label: 'FAQ' },
  { href: '/menu', label: '料金・メニュー' },
];

export default function Nav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem('hal_cinema_logged_in') === 'true');
  }, []);

  function handleLogout() {
    localStorage.removeItem('hal_cinema_logged_in');
    localStorage.removeItem('hal_cinema_user');
    setIsLoggedIn(false);
    window.location.href = '/';
  }

  return (
    <header className={styles.nav} data-nav>
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
          {isLoggedIn && (
            <Link href="/mypage">マイページ</Link>
          )}
        </nav>
        <div className={styles.navCta}>
          {!isLoggedIn ? (
            <Link href="/login" className={shared.btn}>ログイン</Link>
          ) : (
            <button className={shared.btn} onClick={handleLogout}>ログアウト</button>
          )}
          <Link href="/reserve" className={`${shared.btn} ${shared.btnSolid}`}>今すぐ予約する</Link>
        </div>
      </div>
    </header>
  );
}
