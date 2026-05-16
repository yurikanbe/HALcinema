import type { Metadata } from 'next';
import Link from 'next/link';
import moviesData   from '@/data/movies.json';
import schedulesData from '@/data/schedules.json';
import type { Movie, ScreenSchedule } from '@/types';
import { notFound } from 'next/navigation';

const movies    = moviesData    as Movie[];
const schedules = schedulesData as ScreenSchedule[];

const THEATER_NAME: Record<string,string> = { starry: 'Starry Theater', abyss: 'Abyss Theater', cyber: 'Cyber Theater' };

export async function generateStaticParams() {
  return movies.map(m => ({ id: m.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const movie = movies.find(m => m.id === id);
  return { title: movie ? `HAL CINEMA | ${movie.title}` : 'HAL CINEMA' };
}

function formatDuration(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

export default async function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movie = movies.find(m => m.id === id);
  if (!movie) notFound();

  // Group schedules for this movie by theater
  const byTheater = new Map<string, { screen: string; shows: ScreenSchedule['shows'] }[]>();
  for (const s of schedules) {
    const movieShows = s.shows.filter(sh => sh.movieId === id);
    if (!movieShows.length) continue;
    if (!byTheater.has(s.theaterId)) byTheater.set(s.theaterId, []);
    byTheater.get(s.theaterId)!.push({ screen: s.screen, shows: movieShows });
  }

  const posterStyle: React.CSSProperties = movie.colors
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.22),rgba(0,0,0,0.32)), url('${movie.poster}')`,
        background: `linear-gradient(rgba(0,0,0,0.22),rgba(0,0,0,0.32)), url('${movie.poster}') center/cover no-repeat`,
      }
    : { backgroundImage: `linear-gradient(160deg,#0a2060,#1a4a8a)` };

  return (
    <>
      <section className="section" style={{ paddingTop: '56px' }}>
        <div style={{ marginBottom: '16px' }}>
          <Link href="/movies" className="text-link" style={{ paddingRight: 0, fontSize: '11px' }}>← 作品一覧に戻る</Link>
        </div>

        <div className="movie-hero-grid">
          <div className="movie-poster-card" style={posterStyle}></div>
          <div>
            <div className="movie-detail__genre">{movie.category}</div>
            <h1 className="movie-detail__title">{movie.title}</h1>
            <div className="movie-chips">
              <span className="meta-chip">{formatDuration(movie.duration)}</span>
              <span className="meta-chip">{movie.year}年公開</span>
              <span className="meta-chip">{movie.rating}</span>
              {movie.formats.map(f => <span key={f} className="meta-chip">{f}</span>)}
              {movie.status === 'coming_soon' && <span className="meta-chip">Coming Soon</span>}
            </div>
            <p className="movie-detail__desc">{movie.description}</p>
            {movie.cast.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div className="sub-heading">出演</div>
                <div className="cast-list">
                  {movie.cast.map(c => <span key={c} className="cast-chip">{c}</span>)}
                </div>
              </div>
            )}
            {movie.director && (
              <div style={{ marginBottom: '24px' }}>
                <div className="sub-heading">監督</div>
                <span className="cast-chip">{movie.director}</span>
              </div>
            )}
            <Link href="/reserve" className="btn btn--solid" style={{ fontSize: '15px', padding: '13px 28px' }}>
              劇場窓口で予約する
            </Link>
          </div>
        </div>
      </section>

      {byTheater.size > 0 && (
        <section className="section" style={{ paddingTop: '20px' }}>
          <div className="section__head">
            <div>
              <div className="section__hint">Showtime</div>
              <h2 className="section__title">本日の上映スケジュール</h2>
            </div>
            <Link href="/schedule" className="text-link">全日程を見る</Link>
          </div>
          <div className="schedule-grid">
            {Array.from(byTheater.entries()).map(([theaterId, screenList]) =>
              screenList.map(({ screen, shows }) => (
                <div key={`${theaterId}-${screen}`} className="schedule-theater">
                  <div className="schedule-theater__header">
                    <span className="schedule-theater__name">{THEATER_NAME[theaterId]}</span>
                    <span className="schedule-theater__badge">{screen}</span>
                  </div>
                  <div className="time-slots">
                    {shows.map(show => (
                      show.taken ? (
                        <button key={show.start} className="time-btn taken">
                          <span className="time-btn__time">{show.start}</span>
                          <span className="time-btn__info">満席</span>
                        </button>
                      ) : (
                        <Link key={show.start} href="/reserve" className="time-btn" style={{ textDecoration: 'none' }}>
                          <span className="time-btn__time">{show.start}</span>
                          <span className="time-btn__info">残席 {show.seats}</span>
                        </Link>
                      )
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </>
  );
}
