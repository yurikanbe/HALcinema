import type { Metadata } from 'next';
import Link from 'next/link';
import ZoomableImage from '@/components/ZoomableImage';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | アクセス',
};

const STATION_LINES = [
  { badge: 'JR',   colorKey: 'jr',       line: 'JR東海道本線・中央本線・関西本線', gate: '太閤通口',  walk: 3 },
  { badge: '名鉄', colorKey: 'meitetsu', line: '名鉄名古屋駅',                   gate: '中央改札口', walk: 2 },
  { badge: '近鉄', colorKey: 'kintetsu', line: '近鉄名古屋駅',                   gate: '改札口',     walk: 3 },
  { badge: '地下鉄', colorKey: 'subway',  line: '東山線・桜通線 名古屋駅',         gate: '1番出口',    walk: 3 },
];

const BADGE_CLASS: Record<string, string> = {
  jr:       s.badgeJr,
  meitetsu: s.badgeMeitetsu,
  kintetsu: s.badgeKintetsu,
  subway:   s.badgeSubway,
};

const AIRPORT_ROUTES = [
  { from: '中部国際空港', fromSub: 'セントレア', via: '名鉄ミュースカイ', viaSub: '快速特急', time: 28, to: '名鉄名古屋駅' },
  { from: '名古屋空港',   fromSub: '小牧',       via: '高速バス',         viaSub: '直行バス', time: 25, to: '名古屋駅前' },
];

export default function AccessPage() {
  return (
    <>
      <section className={shared.pageHero}>
        <div className={shared.sectionHint}>Access</div>
        <h1 className={shared.pageHeroTitle}>アクセス</h1>
        <p className={shared.pageHeroLead}>名古屋駅から徒歩3分、地下街直結でお越しいただけます。</p>
      </section>

      {/* ── Map ── */}
      <section className={`${shared.section} ${s.mapSection}`} data-reveal>
        <div className={s.mapWrap}>
          <iframe
            className={s.map}
            src="https://www.google.com/maps?q=35.17089,136.88260&output=embed&hl=ja&z=16"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="HAL CINEMA アクセスマップ"
          />
          <div className={s.mapCard}>
            <div className={s.mapCardAddr}>
              <span className={s.mapCardPostal}>〒450-0002</span>
              <span className={s.mapCardAddrMain}>名古屋市中村区名駅4-27-1</span>
            </div>
            <div className={s.mapCardMeta}>
              <span className={s.mapCardMetaItem}>
                <span className={s.mapCardMetaLabel}>OPEN</span>
                10:00 — 24:00
              </span>
              <span className={s.mapCardMetaDivider} />
              <span className={s.mapCardMetaItem}>
                <span className={s.mapCardMetaLabel}>TEL</span>
                052-XXX-XXXX
              </span>
            </div>
            <a
              href="https://maps.google.com/maps?q=名古屋市中村区名駅4-27-1"
              target="_blank"
              rel="noopener noreferrer"
              className={s.mapCardBtn}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              Google マップで開く
            </a>
          </div>
        </div>
      </section>

      {/* ── Exterior ── */}
      <section className={`${shared.section} ${s.exteriorSection}`} data-reveal>
        <div className={s.exteriorWrap}>
          <ZoomableImage src="/images/exterior.png" alt="HAL CINEMA 外観" className={s.exteriorImg}>
            <div className={s.exteriorCaption} aria-hidden="true">
              <span className={s.exteriorCaptionLabel}>HAL CINEMA</span>
              <span className={s.exteriorCaptionSub}>名古屋市中村区名駅 — 地下街直結</span>
            </div>
          </ZoomableImage>
        </div>
      </section>

      {/* ── By Train ── */}
      <section className={shared.section} data-reveal>
        <div className={shared.sectionHead}>
          <div>
            <div className={shared.sectionHint}>By Train</div>
            <h2 className={shared.sectionTitle}>電車でお越しの方</h2>
          </div>
        </div>
        <div className={s.stationHub}>
          <div className={s.stationHubTop}>
            <div className={s.stationHubIcon} aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="3" width="16" height="16" rx="2"/>
                <path d="M9 19v2M15 19v2"/>
                <line x1="9" y1="9" x2="9" y2="14"/>
                <line x1="15" y1="9" x2="15" y2="14"/>
                <line x1="9" y1="9" x2="15" y2="9"/>
              </svg>
            </div>
            <div>
              <div className={s.stationHubName}>名古屋駅</div>
              <div className={s.stationHubSub}>JR・名鉄・近鉄・地下鉄 各線</div>
            </div>
          </div>
          <div className={s.stationLines}>
            {STATION_LINES.map(r => (
              <div key={r.badge} className={s.stationLine}>
                <span className={`${s.stationBadge} ${BADGE_CLASS[r.colorKey]}`}>{r.badge}</span>
                <div className={s.stationLineInfo}>
                  <div className={s.stationLineName}>{r.line}</div>
                  <div className={s.stationLineGate}>{r.gate}</div>
                </div>
                <div className={s.stationWalk}>
                  <span className={s.stationWalkNum}>{r.walk}</span>
                  <div className={s.stationWalkMeta}>
                    <span className={s.stationWalkUnit}>分</span>
                    <span className={s.stationWalkLabel}>徒歩</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className={s.undergroundBanner}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>地下街から直結 — エスカ・ユニモール・サンロード</span>
          </div>
        </div>
      </section>

      {/* ── By Air ── */}
      <section className={shared.section} data-reveal>
        <div className={shared.sectionHead}>
          <div>
            <div className={shared.sectionHint}>By Air</div>
            <h2 className={shared.sectionTitle}>空港からお越しの方</h2>
          </div>
        </div>
        <div className={s.airportGrid}>
          {AIRPORT_ROUTES.map(r => (
            <div key={r.from} className={s.airportRoute}>
              <div className={s.airportNode}>
                <div className={s.airportNodeIcon} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                </div>
                <div className={s.airportNodeName}>{r.from}</div>
                <div className={s.airportNodeSub}>{r.fromSub}</div>
              </div>

              <div className={s.airportFlow}>
                <div className={s.airportFlowLine} />
                <div className={s.airportFlowCard}>
                  <span className={s.airportFlowVia}>{r.via}</span>
                  <span className={s.airportFlowTime}>{r.time}<span className={s.airportFlowMin}>分</span></span>
                  <span className={s.airportFlowSub}>{r.viaSub}</span>
                </div>
                <div className={s.airportFlowLine} />
              </div>

              <div className={s.airportNode}>
                <div className={s.airportNodeIcon} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M9 19v2M15 19v2"/><line x1="9" y1="9" x2="9" y2="14"/><line x1="15" y1="9" x2="15" y2="14"/><line x1="9" y1="9" x2="15" y2="9"/></svg>
                </div>
                <div className={s.airportNodeName}>{r.to}</div>
                <div className={s.airportNodeSub}>HAL CINEMA 徒歩圏内</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Parking ── */}
      <section className={shared.section} data-reveal>
        <div className={shared.sectionHead}>
          <div>
            <div className={shared.sectionHint}>Parking</div>
            <h2 className={shared.sectionTitle}>お車でお越しの方</h2>
          </div>
        </div>
        <div className={shared.featureTiles}>
          <div className={shared.featureTile}>
            <div className={shared.featureTileBadge}>提携駐車場</div>
            <h3 className={shared.featureTileTitle}>HAL パーキング</h3>
            <p className={shared.featureTileDesc}>
              当館から徒歩2分。映画観賞のお客様は2時間無料。<br />
              チケット購入時に駐車券をご提示ください。
            </p>
          </div>
          <div className={shared.featureTile}>
            <div className={shared.featureTileBadge}>収容台数</div>
            <h3 className={shared.featureTileTitle}>120台</h3>
            <p className={shared.featureTileDesc}>
              混雑時はお近くのコインパーキングをご利用ください。<br />
              名駅周辺には多数の駐車場がございます。
            </p>
          </div>
          <div className={shared.featureTile}>
            <div className={shared.featureTileBadge}>注意事項</div>
            <h3 className={shared.featureTileTitle}>駐車場のご案内</h3>
            <p className={shared.featureTileDesc}>
              土日祝・繁忙期は混雑が予想されます。<br />
              公共交通機関でのご来館をおすすめします。
            </p>
          </div>
        </div>
      </section>

      {/* ── Facility companion link ── */}
      <section className={`${shared.section} ${s.facilityCtaSection}`} data-reveal>
        <div className={s.facilityCta}>
          <div className={s.facilityCtaLeft}>
            <div className={shared.sectionHint}>Facility Guide</div>
            <h2 className={s.facilityCtaTitle}>施設案内</h2>
            <p className={s.facilityCtaDesc}>フロアマップ・各種設備・バリアフリー情報をご確認いただけます。</p>
          </div>
          <Link href="/facility" className={`${shared.btn} ${shared.btnSolid}`}>
            施設案内を見る →
          </Link>
        </div>
      </section>
    </>
  );
}
