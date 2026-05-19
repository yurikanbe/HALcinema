import type { Metadata } from 'next';
import Link from 'next/link';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | オンライン予約',
};

export default function ReservePage() {
  return (
    <section className={`${shared.section} ${s.section}`}>
      <div className={s.wrapper}>
        <div className={`${shared.sectionHint} ${s.sectionHintCenter}`}>Online Reservation</div>
        <h1 className={`${shared.sectionTitle} ${s.titleMargin}`}>オンライン予約</h1>

        <div className={s.darkPanel}>
          <div className={s.darkPanelGlow} />
          <div className={s.darkPanelBody}>
            <div className={s.darkPanelLabel}>Coming Soon</div>
            <p className={s.darkPanelTitle}>オンライン予約<br />準備中です</p>
            <p className={s.darkPanelDesc}>
              現在、オンライン予約システムを準備しております。<br />
              今しばらくお待ちください。
            </p>
          </div>
        </div>

        <div className={s.infoPanel}>
          <div className={s.infoPanelLabel}>劇場窓口でご購入いただけます</div>
          <p className={s.infoPanelText}>
            チケットは劇場窓口にてお求めいただけます。<br />
            上映スケジュールをご確認の上、ご来場ください。
          </p>
          <div className={s.infoPanelBtns}>
            <Link href="/schedule" className={`${shared.btn} ${shared.btnSolid}`}>
              上映スケジュールを見る
            </Link>
            <Link href="/menu" className={shared.btn}>
              料金・メニューを見る
            </Link>
          </div>
        </div>

        <div className={s.note}>
          <strong className={s.noteStrong}>劇場窓口受付時間</strong><br />
          OPEN 10:00 — 最終上映開始まで<br />
          〒000-0000 東京都千代田区HAL 8F<br />
          お問い合わせ: info@halcinema.jp
        </div>
      </div>
    </section>
  );
}
