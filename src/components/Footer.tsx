import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div>
          <strong>HAL CINEMA</strong>
          <div>Dive into Cinema</div>
        </div>
        <div>
          <div>〒000-0000 東京都千代田区HAL 8F</div>
          <div>OPEN 10:00 - 24:00</div>
        </div>
        <div>
          <div>スクリーン: 8 / 座席: 1,050</div>
          <div>お問い合わせ: info@halcinema.jp</div>
        </div>
      </div>
    </footer>
  );
}
