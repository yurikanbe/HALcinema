import type { Metadata } from 'next';
import Link from 'next/link';
import Carousel3D from '@/components/Carousel3D';
import moviesData from '@/data/movies.json';
import type { Movie } from '@/types';

export const metadata: Metadata = {
  title: 'HAL CINEMA | 想像を超えるシネマ体験',
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
      <section className="hero-brand">
        <div className="hb-bg" aria-hidden="true">
          <div className="hb-bg__halo"></div>
        </div>
        <div className="hb-frame" aria-hidden="true">
          <span className="hb-corner hb-corner--tl"></span>
          <span className="hb-corner hb-corner--tr"></span>
          <span className="hb-corner hb-corner--bl"></span>
          <span className="hb-corner hb-corner--br"></span>
        </div>
        <div className="hb-logotype">
          <div className="hb-ornament fade-up">
            <span className="hb-ornament__line hb-ornament__line--l"></span>
            <span className="hb-ornament__text">Nagoya · CINEMA</span>
            <span className="hb-ornament__line hb-ornament__line--r"></span>
          </div>
          <img className="hb-logo fade-up delay-1" src="/images/logo_dark.png" alt="HAL CINEMA" />
          <p className="hb-tagline fade-up delay-2"><em>Dive into Cinema</em></p>
        </div>
        <div className="hb-theaters">
          <Link className="hb-th hb-th--starry" href="/theaters#starry">
            <div className="hb-th__bg"></div>
            <div className="hb-th__shade"></div>
            <div className="hb-th__label"><span className="hb-th__dot"></span>Starry</div>
          </Link>
          <Link className="hb-th hb-th--abyss" href="/theaters#abyss">
            <div className="hb-th__bg"></div>
            <div className="hb-th__shade"></div>
            <div className="hb-th__label"><span className="hb-th__dot"></span>Abyss</div>
          </Link>
          <Link className="hb-th hb-th--cyber" href="/theaters#cyber">
            <div className="hb-th__bg"></div>
            <div className="hb-th__shade"></div>
            <div className="hb-th__label"><span className="hb-th__dot"></span>Cyber</div>
          </Link>
        </div>
      </section>

      {/* ── Now Showing + 3D Carousel ── */}
      <section className="section" id="now">
        <div className="section__head">
          <div>
            <div className="section__hint">Now Showing</div>
            <h2 className="section__title">上映中の注目作</h2>
          </div>
          <Link className="text-link" href="/movies">すべて見る</Link>
        </div>
        <Carousel3D movies={carouselMovies} itemCount={18} hasInfoPanel={true} />
      </section>

      {/* ── Signature Services ── */}
      <section className="section" id="services">
        <div className="section__head">
          <div>
            <div className="section__hint">Signature Services</div>
            <h2 className="section__title">静かに支える機能</h2>
          </div>
        </div>
        <div className="feature-tiles">
          <div className="feature-tile">
            <div className="feature-tile__badge">Seat Move</div>
            <h3 className="feature-tile__title">隣席リクエスト</h3>
            <p className="feature-tile__desc">+100円で並び席へ。承諾者にキャッシュバック。</p>
          </div>
          <div className="feature-tile">
            <div className="feature-tile__badge">Seat View</div>
            <h3 className="feature-tile__title">視点プレビュー</h3>
            <p className="feature-tile__desc">座席ごとの見え方を事前に確認。</p>
          </div>
          <div className="feature-tile">
            <div className="feature-tile__badge">Recommend</div>
            <h3 className="feature-tile__title">推し通知</h3>
            <p className="feature-tile__desc">監督・俳優の新作を届ける。</p>
          </div>
        </div>
      </section>

      {/* ── Theater Portfolio ── */}
      <section className="section" id="theaters">
        <div className="section__head">
          <div>
            <div className="section__hint">Theater Portfolio</div>
            <h2 className="section__title">3つのコンセプト空間</h2>
          </div>
        </div>
        <div className="theater-grid">
          <Link className="theater-card theater-card--starry" href="/theaters#starry">
            <div className="theater-card__label">Starry Theater</div>
            <div className="theater-card__meta">200 seats × 3</div>
          </Link>
          <Link className="theater-card theater-card--abyss" href="/theaters#abyss">
            <div className="theater-card__label">Abyss Theater</div>
            <div className="theater-card__meta">120 seats × 2</div>
          </Link>
          <Link className="theater-card theater-card--cyber" href="/theaters#cyber">
            <div className="theater-card__label">Cyber Theater</div>
            <div className="theater-card__meta">70 seats × 3</div>
          </Link>
        </div>
        <div className="section__footer">
          <Link className="text-link text-link--center" href="/theaters">シアター詳細を見る</Link>
        </div>
      </section>

      {/* ── Ticket Pricing ── */}
      <section className="section" id="tickets">
        <div className="section__head">
          <div>
            <div className="section__hint">Ticket Pricing</div>
            <h2 className="section__title">チケット料金</h2>
          </div>
        </div>
        <div className="price-list-panel">
          {[
            { name: '一般', sub: 'General', amount: '1,800' },
            { name: '大学生等', sub: 'University / College', amount: '1,600' },
            { name: '中学・高校生', sub: 'Junior High / High School', amount: '1,400' },
            { name: '小学生・幼児', sub: 'Children', amount: '1,000' },
          ].map(row => (
            <div key={row.name} className="price-list-row">
              <div>
                <div className="price-list-row__name">{row.name}</div>
                <div className="price-list-row__sub">{row.sub}</div>
              </div>
              <div className="price-list-row__right">
                <span className="price-list-row__amount">{row.amount}</span>
                <span className="price-list-row__unit">円</span>
              </div>
            </div>
          ))}
          <div className="price-list-footer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Starry / Abyss シアターはプレミアム席あり（+¥500）
          </div>
        </div>
      </section>
    </>
  );
}
