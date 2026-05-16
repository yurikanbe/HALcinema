import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'HAL CINEMA | オンライン予約',
};

export default function ReservePage() {
  return (
    <section className="section" style={{ paddingTop: '80px', paddingBottom: '100px', textAlign: 'center' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div className="section__hint" style={{ justifyContent: 'center' }}>Online Reservation</div>
        <h1 className="section__title" style={{ marginBottom: '24px' }}>オンライン予約</h1>

        <div style={{
          background: 'linear-gradient(155deg, #060e22, #0b2249 48%, #1a4080)',
          border: '1px solid rgba(200,164,91,0.28)',
          borderRadius: '16px',
          padding: '48px 40px',
          marginBottom: '32px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 90% 10%, rgba(200,164,91,0.14), transparent 55%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              fontSize: '11px',
              letterSpacing: '0.38em',
              textTransform: 'uppercase',
              color: 'rgba(200,164,91,0.8)',
              marginBottom: '20px',
            }}>Coming Soon</div>
            <p style={{
              fontSize: '28px',
              letterSpacing: '0.1em',
              color: '#ffffff',
              marginBottom: '16px',
            }}>オンライン予約<br />準備中です</p>
            <p style={{
              fontSize: '14px',
              lineHeight: '2.0',
              color: 'rgba(255,255,255,0.65)',
              letterSpacing: '0.06em',
            }}>
              現在、オンライン予約システムを準備しております。<br />
              今しばらくお待ちください。
            </p>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(170deg, #ffffff, #f2f6fb)',
          border: '1px solid rgba(200,164,91,0.22)',
          borderRadius: '12px',
          padding: '32px 36px',
          textAlign: 'left',
        }}>
          <div style={{
            fontSize: '11px',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'var(--gold-600)',
            marginBottom: '14px',
          }}>劇場窓口でご購入いただけます</div>
          <p style={{
            fontSize: '15px',
            letterSpacing: '0.06em',
            color: 'var(--ink-800)',
            lineHeight: '1.9',
            marginBottom: '20px',
          }}>
            チケットは劇場窓口にてお求めいただけます。<br />
            上映スケジュールをご確認の上、ご来場ください。
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/schedule" className="btn btn--solid">
              上映スケジュールを見る
            </Link>
            <Link href="/menu" className="btn">
              料金・メニューを見る
            </Link>
          </div>
        </div>

        <div style={{
          marginTop: '32px',
          fontSize: '13px',
          color: 'var(--ink-500)',
          letterSpacing: '0.06em',
          lineHeight: '1.9',
        }}>
          <strong style={{ color: 'var(--ink-700)' }}>劇場窓口受付時間</strong><br />
          OPEN 10:00 — 最終上映開始まで<br />
          〒000-0000 東京都千代田区HAL 8F<br />
          お問い合わせ: info@halcinema.jp
        </div>
      </div>
    </section>
  );
}
