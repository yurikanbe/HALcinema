'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './Nav.module.css';
import shared from '@/styles/shared.module.css';
import { NAV_LINKS } from '@/lib/navLinks';

export default function Nav() {
  const pathname = usePathname();

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
        </nav>
        <div className={styles.navCta}>
          <Link href="/reserve" className={`${shared.btn} ${shared.btnSolid}`}>チケット購入について</Link>
        </div>
      </div>
    </header>
  );
}
