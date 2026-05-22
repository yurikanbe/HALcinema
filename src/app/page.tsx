import type { Metadata } from 'next';
import Link from 'next/link';
import Carousel3D from '@/components/Carousel3D';
import moviesData from '@/data/movies.json';
import type { Movie } from '@/types';
import s from './page.module.css';
import shared from '@/styles/shared.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | Dive into Cinema',
};

const movies = moviesData as Movie[];
const nowShowing = movies.filter(m => m.status === 'now_showing');

export default function HomePage() {
  const carouselMovies = nowShowing.map(m => ({
    id:          m.id,
    title:       m.title,
    category:    m.category,
    poster:      m.poster,
    description: m.description,
  }));

  return (
    <>
      {/* ── Hero Brand ── */}
      <section className={s.heroBrand}>
        <div className={s.hbBg} aria-hidden="true">
          <div className={s.hbBgHalo}></div>
        </div>
        <div className={s.hbFrame} aria-hidden="true">
          <span className={`${s.hbCorner} ${s.hbCornerTl}`}></span>
          <span className={`${s.hbCorner} ${s.hbCornerTr}`}></span>
          <span className={`${s.hbCorner} ${s.hbCornerBl}`}></span>
          <span className={`${s.hbCorner} ${s.hbCornerBr}`}></span>
        </div>
        <div className={s.hbLogotype}>
          <div className={`${s.hbOrnament} ${shared.fadeUp}`}>
            <span className={`${s.hbOrnamentLine} ${s.hbOrnamentLineL}`}></span>
            <span className={s.hbOrnamentText}>Nagoya · CINEMA</span>
            <span className={`${s.hbOrnamentLine} ${s.hbOrnamentLineR}`}></span>
          </div>
          <img className={`${s.hbLogo} ${shared.fadeUp} ${shared.delay1}`} src="/images/logo_dark.png" alt="HAL CINEMA" />
          <p className={`${s.hbTagline} ${shared.fadeUp} ${shared.delay2}`}><em>Dive into Cinema</em></p>
        </div>
        <div className={s.hbTheaters}>
          <Link className={`${s.hbTh} ${s.hbThStarry}`} href="/theaters#starry">
            <div className={s.hbThBg}></div>
            <div className={s.hbThShade}></div>
            <div className={s.hbThLabel}><span className={s.hbThDot}></span>Starry</div>
          </Link>
          <Link className={`${s.hbTh} ${s.hbThAbyss}`} href="/theaters#abyss">
            <div className={s.hbThBg}></div>
            <div className={s.hbThShade}></div>
            <div className={s.hbThLabel}><span className={s.hbThDot}></span>Abyss</div>
          </Link>
          <Link className={`${s.hbTh} ${s.hbThCyber}`} href="/theaters#cyber">
            <div className={s.hbThBg}></div>
            <div className={s.hbThShade}></div>
            <div className={s.hbThLabel}><span className={s.hbThDot}></span>Cyber</div>
          </Link>
        </div>
      </section>

      {/* ── Now Showing + 3D Carousel ── */}
      <section className={shared.section} id="now">
        <div className={shared.sectionHead}>
          <div>
            <div className={shared.sectionHint}>Now Showing</div>
            <h2 className={shared.sectionTitle}>上映中の注目作</h2>
          </div>
          <Link className={shared.textLink} href="/movies">すべて見る →</Link>
        </div>
        <Carousel3D movies={carouselMovies} itemCount={18} hasInfoPanel={true} />
      </section>

      {/* ── Theater Introduction ── */}
      <section className={shared.section} id="theaters">
        <div className={shared.sectionHead}>
          <div>
            <div className={shared.sectionHint}>Theater Experience</div>
            <h2 className={shared.sectionTitle}>劇場紹介</h2>
          </div>
          <Link className={shared.textLink} href="/theaters">シアター詳細を見る →</Link>
        </div>
        <div className={s.theaterShowcase}>
          <div className={s.lobbyShowcase}>
            <div className={s.lobbyVisual} aria-hidden="true">
              <img className={s.lobbyImg} src="/images/lobby.png" alt="HAL CINEMAのロビー" />
            </div>
            <div className={s.lobbyContent}>
              <p className={s.lobbyLead}>上映前の静けさと高揚が交差する場所</p>
              <p className={s.lobbyText}>
                3つのコンセプト空間が、それぞれ異なる余韻を演出。<br />
              </p>
              <div className={s.lobbyMeta}>
                <span>Open 10:00 - 24:00</span>
                <span>Parking 120</span>
                <span>Lobby Cafe</span>
                <span>Free Wi-Fi</span>
              </div>
              <div className={s.lobbyPayment}>
                <div className={s.lobbyPaymentHead}>
                  <span className={s.lobbyPaymentEyebrow}>Payment</span>
                  <span className={s.lobbyPaymentNote}>キャッシュレス対応</span>
                </div>
                <div className={s.lobbyPaymentList}>
                  <span className={s.lobbyPaymentBadge}>Visa</span>
                  <span className={s.lobbyPaymentBadge}>Mastercard</span>
                  <span className={s.lobbyPaymentBadge}>JCB</span>
                  <span className={s.lobbyPaymentBadge}>Amex</span>
                  <span className={s.lobbyPaymentBadge}>交通系IC</span>
                  <span className={s.lobbyPaymentBadge}>iD</span>
                  <span className={s.lobbyPaymentBadge}>QUICPay</span>
                </div>
              </div>
              <div className={s.lobbyAccess}>
                <div className={s.lobbyAccessHead}>
                  <span className={s.lobbyAccessEyebrow}>Access</span>
                  <h3 className={s.lobbyAccessTitle}>交通アクセス</h3>
                </div>
                <ul className={s.lobbyAccessList}>
                  <li className={s.lobbyAccessItem}>
                    <span className={s.lobbyAccessBadge}>Airport</span>
                    <span className={s.lobbyAccessRoute}>中部国際空港（セントレア）</span>
                    <span className={s.lobbyAccessArrow}>→</span>
                    <span className={s.lobbyAccessRoute}>名鉄名古屋駅</span>
                    <span className={s.lobbyAccessTime}>ミュースカイ 28分</span>
                  </li>
                  <li className={s.lobbyAccessItem}>
                    <span className={s.lobbyAccessBadge}>Airport</span>
                    <span className={s.lobbyAccessRoute}>名古屋空港</span>
                    <span className={s.lobbyAccessArrow}>→</span>
                    <span className={s.lobbyAccessRoute}>名古屋駅前</span>
                    <span className={s.lobbyAccessTime}>高速バス 25分</span>
                  </li>
                  <li className={s.lobbyAccessItem}>
                    <span className={s.lobbyAccessBadge}>Station</span>
                    <span className={s.lobbyAccessRoute}>名古屋駅前</span>
                    <span className={s.lobbyAccessTime}>徒歩 3分</span>
                    <span className={s.lobbyAccessNote}>JR・地下鉄・名鉄・近鉄から地下街が直結。</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className={s.theaterCards}>
            <div className={s.theaterCardStack}>
              <Link className={`${shared.theaterCard} ${shared.theaterCardStarry}`} href="/theaters#starry">
                <div className={shared.theaterCardLabel}>Starry Theater</div>
                <div className={shared.theaterCardMeta}>200 seats × 3</div>
              </Link>
              <Link className={`${shared.theaterCard} ${shared.theaterCardAbyss}`} href="/theaters#abyss">
                <div className={shared.theaterCardLabel}>Abyss Theater</div>
                <div className={shared.theaterCardMeta}>120 seats × 2</div>
              </Link>
              <Link className={`${shared.theaterCard} ${shared.theaterCardCyber}`} href="/theaters#cyber">
                <div className={shared.theaterCardLabel}>Cyber Theater</div>
                <div className={shared.theaterCardMeta}>70 seats × 3</div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Signature Services ── */}
      <section className={shared.section} id="services">
        <div className={shared.sectionHead}>
          <div>
            <div className={shared.sectionHint}>Original Services</div>
            <h2 className={shared.sectionTitle}>オリジナル機能</h2>
          </div>
        </div>
        <div className={shared.featureTiles}>
          <div className={shared.featureTile}>
            <div className={shared.featureTileBadge}>Seat Move</div>
            <h3 className={shared.featureTileTitle}>座席移動リクエスト</h3>
            <p className={shared.featureTileDesc}>+100円で並び席へ。承諾者にキャッシュバック。</p>
          </div>
          <div className={shared.featureTile}>
            <div className={shared.featureTileBadge}>Seat View</div>
            <h3 className={shared.featureTileTitle}>視点プレビュー</h3>
            <p className={shared.featureTileDesc}>座席ごとの見え方を事前に確認。</p>
          </div>
          <div className={shared.featureTile}>
            <div className={shared.featureTileBadge}>Recommend</div>
            <h3 className={shared.featureTileTitle}>推し通知</h3>
            <p className={shared.featureTileDesc}>監督・俳優の新作を届ける。</p>
          </div>
        </div>
      </section>

      {/* ── Ticket Pricing ── */}
      <section className={shared.section} id="tickets">
        <div className={shared.sectionHead}>
          <div>
            <div className={shared.sectionHint}>Ticket Pricing</div>
            <h2 className={shared.sectionTitle}>チケット料金</h2>
          </div>
        </div>
        <div className={shared.priceListPanel}>
          {[
            { name: '一般', sub: 'General', amount: '1,800' },
            { name: '大学生等', sub: 'University / College', amount: '1,600' },
            { name: '中学・高校生', sub: 'Junior High / High School', amount: '1,400' },
            { name: '小学生・幼児', sub: 'Children', amount: '1,000' },
          ].map(row => (
            <div key={row.name} className={shared.priceListRow}>
              <div>
                <div className={shared.priceListRowName}>{row.name}</div>
                <div className={shared.priceListRowSub}>{row.sub}</div>
              </div>
              <div className={shared.priceListRowRight}>
                <span className={shared.priceListRowAmount}>{row.amount}</span>
                <span className={shared.priceListRowUnit}>円</span>
              </div>
            </div>
          ))}
          <div className={shared.priceListFooter}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Starry / Abyss シアターはプレミアム席あり（+¥500）
          </div>
        </div>
      </section>
    </>
  );
}
