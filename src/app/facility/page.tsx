import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import ZoomableImage from '@/components/ZoomableImage';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

export const metadata: Metadata = {
  title: 'HAL CINEMA | 施設案内',
};

/* ── Inline SVG icons ── */
const IconParking = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3"/>
    <path d="M9 18V7h5a3 3 0 010 6H9"/>
  </svg>
);
const IconTicket = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9a2 2 0 000 6v4a1 1 0 001 1h18a1 1 0 001-1v-4a2 2 0 000-6V5a1 1 0 00-1-1H3a1 1 0 00-1 1v4z"/>
    <line x1="15" y1="4" x2="15" y2="20" strokeDasharray="2 3"/>
  </svg>
);
const IconLounge = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 9V7a2 2 0 00-2-2H6a2 2 0 00-2 2v2"/>
    <path d="M2 11a2 2 0 012 2v2h16v-2a2 2 0 012-2H2z"/>
    <path d="M4 15v4M20 15v4"/>
  </svg>
);
const IconFood = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8h1a4 4 0 010 8h-1"/>
    <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
    <line x1="6" y1="2" x2="6" y2="8"/>
    <line x1="10" y1="2" x2="10" y2="8"/>
    <line x1="14" y1="2" x2="14" y2="8"/>
  </svg>
);
const IconDrink = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 3h14l-2 9H7L5 3z"/>
    <path d="M7 12a5 5 0 0010 0"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
  </svg>
);
const IconCafe = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 8h1a4 4 0 010 8h-1"/>
    <path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z"/>
    <line x1="6" y1="2" x2="6" y2="5"/>
    <line x1="10" y1="2" x2="10" y2="5"/>
    <line x1="14" y1="2" x2="14" y2="5"/>
  </svg>
);
const IconShop = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 01-8 0"/>
  </svg>
);
const IconView = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 20l4.5-8 3.5 4.5 3-5L19 20H3z"/>
    <circle cx="17.5" cy="7.5" r="2.5"/>
  </svg>
);
const IconScreen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);

type Facility = { icon: ReactNode; name: string; note: string };
type Floor = { level: string; name: string; theme: string; facilities: Facility[] };

const FLOORS: Floor[] = [
  {
    level: 'B1F',
    name: '駐車場',
    theme: '',
    facilities: [
      { icon: <IconParking />, name: '提携駐車場', note: '120台 / 映画観賞で2時間無料' },
    ],
  },
  {
    level: '1F',
    name: 'エントランス',
    theme: '',
    facilities: [
      { icon: <IconTicket />, name: 'チケット窓口',   note: '各種割引・電子チケット対応' },
      { icon: <IconLounge />, name: '中央ラウンジ',   note: '待ち合わせ・上映前後のひと休み' },
      { icon: <IconScreen />, name: '各シアター受付', note: 'Starry / Abyss / Cyber' },
      { icon: <IconFood />,   name: 'フードスタンド', note: 'ポップコーン・ホットフード' },
      { icon: <IconDrink />,  name: 'ドリンクバー',   note: '各種ドリンク・カクテル' },
    ],
  },
  {
    level: '2F',
    name: 'ラウンジフロア',
    theme: '',
    facilities: [
      { icon: <IconCafe />,  name: 'シネマカフェ',  note: 'オリジナルドリンク・スイーツ' },
      { icon: <IconShop />,  name: 'グッズショップ', note: '映画グッズ・限定商品' },
      { icon: <IconView />,  name: 'Sky Lounge',    note: '眺望を楽しむくつろぎのラウンジ' },
    ],
  },
];


const AMENITIES = [
  { badge: 'Wi-Fi',        title: '無料Wi-Fi',     desc: '館内全域でご利用いただけます。接続方法は1Fロビーの案内板をご確認ください。' },
  { badge: 'Cafe',         title: 'シネマカフェ',   desc: '星空をイメージした「Stella Horizon」など、劇場オリジナルドリンクをご用意しています。' },
  { badge: 'Barrier-Free', title: 'バリアフリー',   desc: '車椅子対応エレベーター・スロープ・専用トイレ完備。各シアターに優先席をご用意しています。' },
  { badge: 'Lounge',       title: 'ロビーラウンジ', desc: '上映前後に寛げるソファー席を1Fにご用意。映画の余韻をゆっくりとお楽しみください。' },
];

export default function FacilityPage() {
  return (
    <>
      <section className={shared.pageHero}>
        <div className={shared.sectionHint}>Facility Guide</div>
        <h1 className={shared.pageHeroTitle}>施設案内</h1>
        <p className={shared.pageHeroLead}>HAL CINEMAのフロアマップと各種施設・設備のご案内です。</p>
      </section>

      {/* ── Lobby visual ── */}
      <div className={s.lobbyBanner}>
        <ZoomableImage src="/images/lobby.png" alt="HAL CINEMA ロビー" className={s.lobbyBannerImg}>
          <div className={s.lobbyBannerOverlay} aria-hidden="true">
            <p className={s.lobbyBannerLead}>上映前の静けさと高揚が交差するロビー</p>
          </div>
        </ZoomableImage>
      </div>

      {/* ── Floor Map + Guide (side by side) ── */}
      <section className={shared.section} data-reveal>
        <div className={shared.sectionHead}>
          <div>
            <div className={shared.sectionHint}>Floor Guide</div>
            <h2 className={shared.sectionTitle}>フロアガイド</h2>
          </div>
        </div>
        <div className={s.floorContent}>
          <div className={s.floorMapWrap}>
            <ZoomableImage
              src="/images/facility/floormap.png"
              alt="HAL CINEMA フロアマップ"
              className={s.floorMapImg}
            />
          </div>
          <div className={s.floorList}>
            {FLOORS.map(floor => (
              <div
                key={floor.level}
                className={s.floorRow}
              >
                <div className={s.floorLevel}>
                  <span className={s.floorLevelNum}>{floor.level}</span>
                  <span className={s.floorLevelName}>{floor.name}</span>
                </div>
                <div className={s.floorFacilities}>
                  {floor.facilities.map((f, i) => (
                    <div key={i} className={s.facilityItem}>
                      <span className={s.facilityItemIcon}>{f.icon}</span>
                      <div>
                        <div className={s.facilityItemName}>{f.name}</div>
                        <div className={s.facilityItemNote}>{f.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Amenities ── */}
      <section className={shared.section} data-reveal>
        <div className={shared.sectionHead}>
          <div>
            <div className={shared.sectionHint}>Amenities</div>
            <h2 className={shared.sectionTitle}>設備・サービス</h2>
          </div>
        </div>
        <div className={shared.featureTiles}>
          {AMENITIES.map(a => (
            <div key={a.badge} className={shared.featureTile}>
              <div className={shared.featureTileBadge}>{a.badge}</div>
              <h3 className={shared.featureTileTitle}>{a.title}</h3>
              <p className={shared.featureTileDesc}>{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={`${shared.section} ${s.facilityCtaSection}`} data-reveal>
        <div className={s.facilityCta}>
          <div className={s.facilityCtaLeft}>
            <div className={shared.sectionHint}>Access</div>
            <h2 className={s.facilityCtaTitle}>アクセスはこちら</h2>
            <p className={s.facilityCtaDesc}>名古屋駅から徒歩3分 / 地下街直結</p>
          </div>
          <Link href="/access" className={`${shared.btn} ${shared.btnSolid}`}>
            アクセス詳細を見る →
          </Link>
        </div>
      </section>
    </>
  );
}
