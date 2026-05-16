'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_LINKS = [
  { href: '/', label: 'ホーム' },
  { href: '/movies', label: '作品一覧' },
  { href: '/schedule', label: '上映スケジュール' },
  { href: '/theaters', label: 'シアター' },
  { href: '/news', label: 'お知らせ' },
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
    <header className="nav">
      <div className="nav__inner">
        <Link className="logo" href="/" aria-label="HAL CINEMA ホーム">
          <img className="logo__image" src="/images/logo.png" alt="HAL CINEMA" />
        </Link>
        <nav className="nav__links">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={pathname === href ? { color: 'var(--gold-500)' } : undefined}
            >
              {label}
            </Link>
          ))}
          {isLoggedIn && (
            <Link href="/mypage" className="nav__mypage-link">マイページ</Link>
          )}
        </nav>
        <div className="nav__cta">
          {!isLoggedIn ? (
            <Link href="/login" className="btn nav__login-btn">ログイン</Link>
          ) : (
            <button className="btn nav__logout-btn" onClick={handleLogout}>ログアウト</button>
          )}
          <Link href="/reserve" className="btn btn--solid">今すぐ予約する</Link>
        </div>
      </div>
    </header>
  );
}
