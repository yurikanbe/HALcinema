import Link from 'next/link';
import styles from './Footer.module.css';

const NAV_LINKS = [
  { href: '/',         label: 'ホーム' },
  { href: '/movies',   label: '作品一覧' },
  { href: '/schedule', label: '上映スケジュール' },
  { href: '/theaters', label: 'シアター' },
  { href: '/news',     label: 'お知らせ' },
  { href: '/faq',      label: 'FAQ' },
  { href: '/menu',     label: '料金・メニュー' },
];

const THEATERS = [
  { href: '/theaters#starry', label: 'Starry Theater', meta: '200席 × 3スクリーン', dot: styles.dotStarry },
  { href: '/theaters#abyss',  label: 'Abyss Theater',  meta: '120席 × 2スクリーン', dot: styles.dotAbyss },
  { href: '/theaters#cyber',  label: 'Cyber Theater',  meta: '70席 × 3スクリーン',  dot: styles.dotCyber },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>

        {/* Brand */}
        <div className={styles.brand}>
          <Link href="/" className={styles.logoLink}>
            <img src="/images/logo_dark.png" alt="HAL CINEMA" className={styles.logo} />
          </Link>
          <p className={styles.tagline}>Dive into Cinema</p>
          <p className={styles.desc}>
            名古屋・名駅エリアに位置する体験型シネマコンプレックス。
            星空・深海・サイバー、3つの没入空間で映画の世界へ。
          </p>
          <a href="mailto:info@halcinema.jp" className={styles.mail}>
            info@halcinema.jp
          </a>
        </div>

        {/* Site map */}
        <div>
          <div className={styles.colHead}>サイトマップ</div>
          <ul className={styles.linkList}>
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={styles.navLink}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Theaters */}
        <div>
          <div className={styles.colHead}>シアター</div>
          <ul className={styles.linkList}>
            {THEATERS.map(({ href, label, meta, dot }) => (
              <li key={href}>
                <Link href={href} className={styles.theaterLink}>
                  <span className={`${styles.dot} ${dot}`} />
                  <span>
                    <span className={styles.theaterName}>{label}</span>
                    <span className={styles.theaterMeta}>{meta}</span>
                  </span>
                </Link>
              </li>
            ))}
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
          <span className={styles.copy}>© 2026 HAL CINEMA. All rights reserved.</span>
          <Link href="/reserve" className={styles.bottomCta}>チケット購入について →</Link>
        </div>
      </div>
    </footer>
  );
}
