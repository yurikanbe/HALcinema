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
          <div>〒450-0002 名古屋市中村区名駅4-27-1</div>
          <div>OPEN 10:00 - 24:00</div>
        </div>
        <div>
          <div>スクリーン：8 / 座席：1,050</div>
          <div>お問い合わせ：info@halcinema.jp</div>
        </div>
      </div>
    </footer>
  );
}
