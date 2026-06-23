'use client';

import { useState, useEffect, useRef } from 'react';
import scheduleData from '@/data/schedules.json';
import moviesData   from '@/data/movies.json';
import type { ScreenSchedule, Movie } from '@/types';
import tl from './ScheduleTimeline.module.css';
import shared from '@/styles/shared.module.css';
import { THEATER_IDS, THEATER_CONFIG } from '@/lib/theaterConfig';
import FilterButtonGroup from '@/components/FilterButtonGroup';
import { buildReserveUrl } from '@/lib/reserveData';

const DAYS   = ['日','月','火','水','木','金','土'];
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

const PX_HR    = 100;
const TL_START = 10;
const TL_END   = 24;
const TL_HOURS = TL_END - TL_START;
const LABEL_W  = 148;
const TRACK_W  = TL_HOURS * PX_HR;

const THEATERS = THEATER_IDS.map(id => ({ id, label: THEATER_CONFIG[id].shortLabel }));

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
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function durWidth(min: number)  { return min / 60 * PX_HR - 4; }

const THEATER_VARIANT: Record<string, string> = {
  starry: tl.tlGroupStarry,
  abyss:  tl.tlGroupAbyss,
  cyber:  tl.tlGroupCyber,
};
const THEATER_HEAD_VARIANT: Record<string, string> = {
  starry: tl.tlTheaterHeadStarry,
  abyss:  tl.tlTheaterHeadAbyss,
  cyber:  tl.tlTheaterHeadCyber,
};

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


  }, []);

  useEffect(() => {
    const wrap  = wrapRef.current;
    const axis  = axisStickyRef.current;
    if (!wrap || !axis) return;
    const onScroll = () => { axis.scrollLeft = wrap.scrollLeft; };
    wrap.addEventListener('scroll', onScroll, { passive: true });
    return () => wrap.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!today || !selectedDate || !wrapRef.current) return;
    if (selectedDate.toDateString() !== today.toDateString()) return;
    const now = new Date();
    const min = now.getHours() * 60 + now.getMinutes();
    const offset = (min - TL_START * 60 - 60) / 60 * PX_HR;
    wrapRef.current.scrollLeft = Math.max(0, offset);
  }, [today, selectedDate]);

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
      <div className={shared.dateStrip}>
        {dates.map((d, i) => (
          <button
            key={i}
            className={`${shared.dateBtn}${selectedDate && d.toDateString() === selectedDate.toDateString() ? ' ' + shared.dateBtnActive : ''}`}
            onClick={() => setSelectedDate(d)}
          >
            <span className={shared.dateBtnDay}>{DAYS[d.getDay()]}</span>
            <span className={shared.dateBtnNum}>{d.getDate()}</span>
            <span className={shared.dateBtnMonth}>{MONTHS[d.getMonth()]}</span>
          </button>
        ))}
      </div>

      {/* ── Top bar ── */}
      <div className={tl.schedTopbar}>
        <div className={tl.schedDateLabel}>{dateLabel}</div>
        <FilterButtonGroup
          options={[
            { value: 'all', label: 'すべて' },
            ...THEATER_IDS.map(id => ({ value: id, label: THEATER_CONFIG[id].name.split(' ')[0] })),
          ]}
          active={activeTheater}
          onChange={setActiveTheater}
          className={shared.theaterFilter}
          id="theater-filter"
        />
      </div>

      {/* ── Sticky time axis ── */}
      <div className={tl.tlAxisSticky} ref={axisStickyRef}>
        <div className={tl.tlInner}>
          <div className={tl.tlAxis}>
            <div className={tl.tlAxisCorner}>Time</div>
            <div className={tl.tlAxisHours}>
              {Array.from({ length: TL_HOURS }, (_, i) => (
                <div key={i} className={tl.tlAxisHour}>{TL_START + i}:00</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className={tl.tlWrap} ref={wrapRef}>
        <div className={tl.tlInner}>
          <div className={tl.tlBody}>
            {visibleTheaters.map(theater => {
              const theaterScreens = screens.filter(s => s.theaterId === theater.id);
              if (!theaterScreens.length) return null;
              return (
                <div key={theater.id} className={`${tl.tlGroup} ${THEATER_VARIANT[theater.id] ?? ''}`}>
                  <div className={`${tl.tlTheaterHead} ${THEATER_HEAD_VARIANT[theater.id] ?? ''}`}>
                    <div className={tl.tlTheaterHeadLabel}>
                      <span className={tl.tlTheaterHeadDot}></span>
                      {theater.label}
                    </div>
                    <div className={tl.tlTheaterHeadBar} style={{ width: TRACK_W }}></div>
                  </div>

                  {theaterScreens.map((screen, si) => (
                    <div key={si} className={tl.tlRow}>
                      <div className={tl.tlRowLabel}>
                        <span className={tl.tlRowScreen}>{screen.screen}</span>
                      </div>
                      <div className={tl.tlRowTrack} style={{ width: TRACK_W }}>
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
                              <div key={showIdx} className={`${tl.tlBlock} ${tl.tlBlockTaken}`} style={blockStyle}>
                                <span className={tl.tlBlockTime}>{show.start}</span>
                                <span className={tl.tlBlockTitle}>{show.title}</span>
                                <div className={tl.tlBlockFoot}>
                                  <span className={tl.tlBlockSeats}>満席</span>
                                  <span className={tl.tlBlockFormat}>{show.format}</span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <a
                              key={showIdx}
                              className={tl.tlBlock}
                              href={selectedDate ? buildReserveUrl({
                                movieId: show.movieId,
                                theaterId: theater.id,
                                screen: screen.screen,
                                time: show.start,
                                date: toISODate(selectedDate),
                                format: show.format,
                              }) : '/reserve'}
                              style={blockStyle}
                            >
                              <span className={tl.tlBlockTime}>{show.start}</span>
                              <span className={tl.tlBlockTitle}>{show.title}</span>
                              <div className={tl.tlBlockFoot}>
                                <span className={`${tl.tlBlockSeats}${few ? ' ' + tl.tlBlockSeatsFew : ''}`}>
                                  残席{show.seats}
                                </span>
                                <span className={tl.tlBlockFormat}>{show.format}</span>
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
              <div className={tl.tlNowLine} style={{ left: nowLine.left }}>
                <div className={tl.tlNowDot}></div>
                <div className={tl.tlNowTime}>{nowLine.time}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!anyVisible && (
        <div className={tl.schedEmpty}>該当する上映がありません</div>
      )}
    </>
  );
}
