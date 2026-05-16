'use client';

import { useState, useEffect, useRef } from 'react';
import scheduleData from '@/data/schedules.json';
import moviesData   from '@/data/movies.json';
import type { ScreenSchedule, Movie } from '@/types';

const DAYS   = ['日','月','火','水','木','金','土'];
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

const PX_HR    = 100;
const TL_START = 10;
const TL_END   = 24;
const TL_HOURS = TL_END - TL_START;
const LABEL_W  = 148;
const TRACK_W  = TL_HOURS * PX_HR;

const THEATERS = [
  { id: 'starry', label: 'STARRY' },
  { id: 'abyss',  label: 'ABYSS'  },
  { id: 'cyber',  label: 'CYBER'  },
];

const screens = scheduleData as ScreenSchedule[];
const movies  = moviesData   as Movie[];

function getMovieColors(movieId: string) {
  const m = movies.find(m => m.id === movieId);
  if (!m?.colors) return null;
  return { poster: m.poster, solid: m.colors.solid, fade: m.colors.fade };
}

function toMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function timeLeft(t: string)    { return (toMin(t) - TL_START * 60) / 60 * PX_HR; }
function durWidth(min: number)  { return min / 60 * PX_HR - 4; }

export default function ScheduleTimeline({ initialTheater }: { initialTheater?: string }) {
  const [dates, setDates]               = useState<Date[]>([]);
  const [today, setToday]               = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeTheater, setActiveTheater] = useState(initialTheater || 'all');

  const wrapRef      = useRef<HTMLDivElement>(null);
  const axisStickyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setSelectedDate(now);
    setDates(Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      return d;
    }));

    // Set sticky axis top to nav height
    const nav = document.querySelector<HTMLElement>('.nav');
    if (nav && axisStickyRef.current) {
      axisStickyRef.current.style.top = nav.offsetHeight + 'px';
    }
  }, []);

  // Sync horizontal scroll: timeline wrap → axis strip
  useEffect(() => {
    const wrap  = wrapRef.current;
    const axis  = axisStickyRef.current;
    if (!wrap || !axis) return;
    const onScroll = () => { axis.scrollLeft = wrap.scrollLeft; };
    wrap.addEventListener('scroll', onScroll, { passive: true });
    return () => wrap.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll to current time on first render
  useEffect(() => {
    if (!today || !selectedDate || !wrapRef.current) return;
    if (selectedDate.toDateString() !== today.toDateString()) return;
    const now = new Date();
    const min = now.getHours() * 60 + now.getMinutes();
    const offset = (min - TL_START * 60 - 60) / 60 * PX_HR;
    wrapRef.current.scrollLeft = Math.max(0, offset);
  }, [today, selectedDate]);

  // Now-line data
  const nowLine = (() => {
    if (!today || !selectedDate) return null;
    if (selectedDate.toDateString() !== today.toDateString()) return null;
    const now = new Date();
    const min = now.getHours() * 60 + now.getMinutes();
    if (min < TL_START * 60 || min > TL_END * 60) return null;
    const h = now.getHours(), m = now.getMinutes();
    return {
      left: LABEL_W + (min - TL_START * 60) / 60 * PX_HR,
      time: `${h}:${m < 10 ? '0' : ''}${m}`,
    };
  })();

  const visibleTheaters = THEATERS.filter(t => activeTheater === 'all' || t.id === activeTheater);
  const anyVisible      = visibleTheaters.some(t => screens.some(s => s.theaterId === t.id));

  const dateLabel = selectedDate
    ? `${MONTHS[selectedDate.getMonth()]}${selectedDate.getDate()}日（${DAYS[selectedDate.getDay()]}）の上映スケジュール`
    : '';

  return (
    <>
      {/* ── Date strip ── */}
      <div className="date-strip">
        {dates.map((d, i) => (
          <button
            key={i}
            className={`date-btn${selectedDate && d.toDateString() === selectedDate.toDateString() ? ' active' : ''}`}
            onClick={() => setSelectedDate(d)}
          >
            <span className="date-btn__day">{DAYS[d.getDay()]}</span>
            <span className="date-btn__num">{d.getDate()}</span>
            <span className="date-btn__month">{MONTHS[d.getMonth()]}</span>
          </button>
        ))}
      </div>

      {/* ── Top bar ── */}
      <div className="sched-topbar">
        <div className="sched-date-label">{dateLabel}</div>
        <div className="theater-filter" id="theater-filter">
          {[{ id: 'all', label: 'すべて' }, ...THEATERS.map(t => ({ id: t.id, label: t.label.charAt(0) + t.label.slice(1).toLowerCase() }))].map(t => (
            <button
              key={t.id}
              className={`filter-btn${activeTheater === t.id ? ' active' : ''}`}
              data-theater={t.id}
              onClick={() => setActiveTheater(t.id)}
            >
              {t.id === 'all' ? 'すべて' : t.id === 'starry' ? 'Starry' : t.id === 'abyss' ? 'Abyss' : 'Cyber'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sticky time axis ── */}
      <div className="tl-axis-sticky" ref={axisStickyRef}>
        <div className="tl-inner">
          <div className="tl-axis">
            <div className="tl-axis__corner">Time</div>
            <div className="tl-axis__hours">
              {Array.from({ length: TL_HOURS }, (_, i) => (
                <div key={i} className="tl-axis__hour">{TL_START + i}:00</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="tl-wrap" ref={wrapRef}>
        <div className="tl-inner">
          <div className="tl-body">
            {visibleTheaters.map(theater => {
              const theaterScreens = screens.filter(s => s.theaterId === theater.id);
              if (!theaterScreens.length) return null;
              return (
                <div key={theater.id} className={`tl-group tl-group--${theater.id}`}>
                  <div className={`tl-theater-head tl-theater-head--${theater.id}`}>
                    <div className="tl-theater-head__label">
                      <span className="tl-theater-head__dot"></span>
                      {theater.label}
                    </div>
                    <div className="tl-theater-head__bar" style={{ width: TRACK_W }}></div>
                  </div>

                  {theaterScreens.map((screen, si) => (
                    <div key={si} className="tl-row">
                      <div className="tl-row__label">
                        <span className="tl-row__screen">{screen.screen}</span>
                      </div>
                      <div className="tl-row__track" style={{ width: TRACK_W }}>
                        {screen.shows.map((show, showIdx) => {
                          const left  = timeLeft(show.start);
                          const width = durWidth(show.duration);
                          const taken = !!show.taken;
                          const few   = !taken && show.seats !== undefined && show.seats <= 30;
                          const mc    = getMovieColors(show.movieId);

                          const blockStyle: React.CSSProperties = {
                            left,
                            width,
                            ...(mc ? {
                              background: `linear-gradient(to right, ${mc.solid} 0%, ${mc.solid} 46%, ${mc.fade} 90%), url('${mc.poster}') center / cover no-repeat`,
                            } : {}),
                          };

                          if (taken) {
                            return (
                              <div key={showIdx} className="tl-block tl-block--taken" style={blockStyle}>
                                <span className="tl-block__time">{show.start}</span>
                                <span className="tl-block__title">{show.title}</span>
                                <div className="tl-block__foot">
                                  <span className="tl-block__seats">満席</span>
                                  <span className="tl-block__format">{show.format}</span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <a key={showIdx} className="tl-block" href="/reserve" style={blockStyle}>
                              <span className="tl-block__time">{show.start}</span>
                              <span className="tl-block__title">{show.title}</span>
                              <div className="tl-block__foot">
                                <span className={`tl-block__seats${few ? ' tl-block__seats--few' : ''}`}>
                                  残席{show.seats}
                                </span>
                                <span className="tl-block__format">{show.format}</span>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            {nowLine && (
              <div className="tl-now-line" style={{ left: nowLine.left }}>
                <div className="tl-now-dot"></div>
                <div className="tl-now-time">{nowLine.time}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!anyVisible && (
        <div className="sched-empty">該当する上映がありません</div>
      )}
    </>
  );
}
