import type { Metadata } from 'next';
import Link from 'next/link';
import moviesData   from '@/data/movies.json';
import schedulesData from '@/data/schedules.json';
import type { Movie, ScreenSchedule } from '@/types';
import { notFound } from 'next/navigation';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

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

  const byTheater = new Map<string, { screen: string; shows: ScreenSchedule['shows'] }[]>();
  for (const s of schedules) {
    const movieShows = s.shows.filter(sh => sh.movieId === id);
    if (!movieShows.length) continue;
    if (!byTheater.has(s.theaterId)) byTheater.set(s.theaterId, []);
    byTheater.get(s.theaterId)!.push({ screen: s.screen, shows: movieShows });
  }

  const posterStyle: React.CSSProperties = movie.colors
    ? { background: `linear-gradient(rgba(0,0,0,0.22),rgba(0,0,0,0.32)), url('${movie.poster}') center/cover no-repeat` }
    : { backgroundImage: `linear-gradient(160deg,#0a2060,#1a4a8a)` };

  return (
    <>
      <section className={`${shared.section} ${s.sectionTop}`}>
        <div className={s.backLink}>
          <Link href="/movies" className={`${shared.textLink} ${s.backLink}`}>← 作品一覧に戻る</Link>
        </div>

        <div className={shared.movieHeroGrid}>
          <div className={shared.moviePosterCard} style={posterStyle}></div>
          <div>
            <div className={shared.movieDetailGenre}>{movie.category}</div>
            <h1 className={shared.movieDetailTitle}>{movie.title}</h1>
            <div className={shared.movieChips}>
              <span className={shared.metaChip}>{formatDuration(movie.duration)}</span>
              <span className={shared.metaChip}>{movie.year}年公開</span>
              <span className={shared.metaChip}>{movie.rating}</span>
              {movie.formats.map(f => <span key={f} className={shared.metaChip}>{f}</span>)}
              {movie.status === 'coming_soon' && <span className={shared.metaChip}>Coming Soon</span>}
            </div>
            <p className={shared.movieDetailDesc}>{movie.description}</p>
            {movie.cast.length > 0 && (
              <div className={s.castBlock}>
                <div className={shared.subHeading}>出演</div>
                <div className={shared.castList}>
                  {movie.cast.map(c => <span key={c} className={shared.castChip}>{c}</span>)}
                </div>
              </div>
            )}
            {movie.director && (
              <div className={s.directorBlock}>
                <div className={shared.subHeading}>監督</div>
                <span className={shared.castChip}>{movie.director}</span>
              </div>
            )}
            <Link href="/reserve" className={`${shared.btn} ${shared.btnSolid} ${s.reserveBtn}`}>
              劇場窓口で予約する
            </Link>
          </div>
        </div>
      </section>

      {byTheater.size > 0 && (
        <section className={`${shared.section} ${s.scheduleSection}`}>
          <div className={shared.sectionHead}>
            <div>
              <div className={shared.sectionHint}>Showtime</div>
              <h2 className={shared.sectionTitle}>本日の上映スケジュール</h2>
            </div>
            <Link href="/schedule" className={shared.textLink}>全日程を見る</Link>
          </div>
          <div className={shared.scheduleGrid}>
            {Array.from(byTheater.entries()).map(([theaterId, screenList]) =>
              screenList.map(({ screen, shows }) => (
                <div key={`${theaterId}-${screen}`} className={shared.scheduleTheater}>
                  <div className={shared.scheduleTheaterHeader}>
                    <span className={shared.scheduleTheaterName}>{THEATER_NAME[theaterId]}</span>
                    <span className={shared.scheduleTheaterBadge}>{screen}</span>
                  </div>
                  <div className={shared.timeSlots}>
                    {shows.map(show => (
                      show.taken ? (
                        <button key={show.start} className={`${shared.timeBtn} ${shared.timeBtnTaken}`}>
                          <span className={shared.timeBtnTime}>{show.start}</span>
                          <span className={shared.timeBtnInfo}>満席</span>
                        </button>
                      ) : (
                        <Link key={show.start} href="/reserve" className={shared.timeBtn}>
                          <span className={shared.timeBtnTime}>{show.start}</span>
                          <span className={shared.timeBtnInfo}>残席 {show.seats}</span>
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
