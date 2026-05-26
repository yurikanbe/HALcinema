import Link from 'next/link';
import styles from './Footer.module.css';
import { NAV_LINKS } from '@/lib/navLinks';
import { THEATER_IDS, THEATER_CONFIG } from '@/lib/theaterConfig';

const DOT_CLASS: Record<string, string> = {
  starry: styles.dotStarry,
  abyss:  styles.dotAbyss,
  cyber:  styles.dotCyber,
};

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>

        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandHead}>
            <Link href="/" className={styles.logoLink}>
              <img src="/images/logo_dark.png" alt="HAL CINEMA" className={styles.logo} />
            </Link>
            <p className={styles.tagline}>Dive into Cinema</p>
            <p className={styles.desc}>
              3つのコンセプト空間で映画の世界へ。
            </p>
          </div>
          <a href="mailto:info@halcinema.jp" className={styles.mail}>
            info@halcinema.jp
          </a>
        </div>

        {/* Site map */}
        <div>
          <div className={styles.colHead}>サイトマップ</div>
          <ul className={`${styles.linkList} ${styles.linkListTwo}`}>
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={styles.navLink}>{label}</Link>
              </li>
            ))}
            <li><Link href="/facility" className={styles.navLink}>施設案内</Link></li>
            <li><Link href="/faq"      className={styles.navLink}>FAQ</Link></li>
          </ul>
        </div>

        {/* Theaters */}
        <div>
          <div className={styles.colHead}>シアター</div>
          <ul className={styles.linkList}>
            {THEATER_IDS.map(id => {
              const t = THEATER_CONFIG[id];
              return (
                <li key={id}>
                  <Link href={t.href} className={styles.theaterLink}>
                    <span className={`${styles.dot} ${DOT_CLASS[id]}`} />
                    <span>
                      <span className={styles.theaterName}>{t.name}</span>
                      <span className={styles.theaterMeta}>{t.meta}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Access */}
        <div>
          <div className={styles.colHead}>アクセス・情報</div>
          <ul className={styles.infoList}>
            <li className={styles.infoItem}>
              <span className={styles.infoLabel}>住所</span>
              <span>〒450-0002<br />名古屋市中村区名駅4-27-1</span>
            </li>
            <li className={styles.infoItem}>
              <span className={styles.infoLabel}>営業時間</span>
              <span>OPEN 10:00 — 24:00</span>
            </li>
            <li className={styles.infoItem}>
              <span className={styles.infoLabel}>スクリーン</span>
              <span>8スクリーン / 総座席数 1,050</span>
            </li>
            <li className={styles.infoItem}>
              <span className={styles.infoLabel}>アクセス</span>
              <span>名古屋駅から徒歩3分<br />地下街直結</span>
            </li>
          </ul>
        </div>

      </div>

      {/* Bottom bar */}
      <div className={styles.bottom}>
        <div className={styles.bottomInner}>
          <span className={styles.copy}>&copy; 2026 HAL CINEMA. All rights reserved.</span>
          <Link href="/reserve" className={styles.bottomCta}>チケット購入について →</Link>
        </div>
      </div>
    </footer>
  );
}
