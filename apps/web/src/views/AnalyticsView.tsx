import { useMemo } from 'react';
import {
  activeDays,
  completionRate,
  dailyAverage,
  dailyMinutes,
  dayKey,
  deriveStats,
  dueCards,
  focusSessions,
  focusTrend,
  formatMinutes,
  hourDistribution,
  minutesOn,
  plantProgress,
  retentionRate,
  streaks,
  subjectShares,
  todayKey,
  useApp,
  weekComparison,
  weekdayDistribution,
  type SessionLog,
} from '@cutepad/core';
import { EmptyState, Ic, Mascot, PlantCompanion, ProgressBar, type IconName } from '@cutepad/ui';
import { useHashRoute, useMascotMood } from '../hooks';
import { useT } from '../i18n';
import './AnalyticsView.css';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function StatCard({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <div className="card stat-card">
      <div className="stat-icon" aria-hidden="true">
        <Ic name={icon} size={22} />
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function heatLevel(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes <= 15) return 1;
  if (minutes <= 30) return 2;
  if (minutes <= 60) return 3;
  if (minutes <= 120) return 4;
  return 5;
}

function prettyDate(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AnalyticsView() {
  const [, navigate] = useHashRoute();
  const mood = useMascotMood();
  const t = useT();
  const sessions = useApp((s) => s.sessions);
  const subjects = useApp((s) => s.subjects);
  const tasks = useApp((s) => s.tasks);
  const flashcards = useApp((s) => s.flashcards);
  const reviewLogs = useApp((s) => s.reviewLogs);

  const stats = useMemo(() => deriveStats({ sessions, tasks, notesCount: 0 }), [sessions, tasks]);
  const streak = useMemo(() => streaks(sessions, tasks), [sessions, tasks]);
  const last7 = useMemo(() => dailyMinutes(sessions, 7), [sessions]);
  const last14 = useMemo(() => dailyMinutes(sessions, 14), [sessions]);
  const comparison = useMemo(() => weekComparison(sessions), [sessions]);
  const shares = useMemo(() => subjectShares(sessions, subjects), [sessions, subjects]);
  const focus = useMemo(() => focusSessions(sessions), [sessions]);
  const completion = useMemo(() => completionRate(tasks, 30), [tasks]);
  const active30 = useMemo(() => activeDays(sessions, 30), [sessions]);
  const avgActive = useMemo(() => dailyAverage(sessions, 30), [sessions]);
  const trend = useMemo(() => focusTrend(sessions, 30), [sessions]);
  const weekDist = useMemo(() => weekdayDistribution(sessions), [sessions]);
  const hourDist = useMemo(() => hourDistribution(sessions), [sessions]);
  const due = useMemo(() => dueCards(flashcards).length, [flashcards]);
  const retention = useMemo(() => retentionRate(reviewLogs), [reviewLogs]);
  const reviews7 = useMemo(
    () => reviewLogs.filter((l) => l.reviewedAt > Date.now() - 7 * 864e5).length,
    [reviewLogs],
  );

  const avg7 = Math.round(last7.reduce((sum, d) => sum + d.minutes, 0) / 7);
  const max14 = Math.max(30, ...last14.map((d) => d.minutes));
  const maxSubject = Math.max(1, ...shares.map((r) => r.minutes));
  const maxTrend = Math.max(30, ...trend.map((d) => Math.max(d.minutes, d.avg7)));
  const trendLine = trend
    .map((d, i) => `${i * 20 + 10},${(174 - Math.max(0, (d.avg7 / maxTrend) * 166)).toFixed(1)}`)
    .join(' ');
  const weekMax = Math.max(1, ...weekDist.map((d) => d.minutes));
  const hourMax = Math.max(1, ...hourDist.map((d) => d.minutes));
  const hasWeek = weekDist.some((d) => d.minutes > 0);
  const hasHour = hourDist.some((d) => d.minutes > 0);
  const bestWeekRow = hasWeek ? weekDist.reduce((a, b) => (b.minutes > a.minutes ? b : a)) : null;
  const topHourRow = hasHour ? hourDist.reduce((a, b) => (b.minutes > a.minutes ? b : a)) : null;

  const heat = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 11 * 7 - today.getDay());
    const tk = todayKey();
    const cells: { date: string; minutes: number; future: boolean }[] = [];
    const cur = new Date(start);
    while (cells.length < 84) {
      const key = dayKey(cur);
      cells.push({ date: key, minutes: minutesOn(sessions, key), future: key > tk });
      cur.setDate(cur.getDate() + 1);
    }
    return cells;
  }, [sessions]);

  const longest = useMemo(() => {
    let best: SessionLog | null = null;
    for (const s of focus) {
      if (!best || s.minutes > best.minutes) best = s;
    }
    return best;
  }, [focus]);

  const weekday = useMemo(() => {
    const mins = [0, 0, 0, 0, 0, 0, 0];
    let total = 0;
    for (const s of focus) {
      mins[new Date(s.startedAt).getDay()] += s.minutes;
      total += s.minutes;
    }
    if (total === 0) return { name: '—', minutes: 0 };
    let idx = 0;
    for (let i = 1; i < 7; i++) if (mins[i] > mins[idx]) idx = i;
    return { name: WEEKDAYS[idx], minutes: mins[idx] };
  }, [focus]);

  const bestDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of focus) {
      const key = dayKey(s.startedAt);
      map.set(key, (map.get(key) ?? 0) + s.minutes);
    }
    let best: { date: string; minutes: number } | null = null;
    for (const [date, minutes] of map) {
      if (!best || minutes > best.minutes) best = { date, minutes };
    }
    return best;
  }, [focus]);

  const plant = plantProgress(stats.totalMinutes);
  const favorite = shares[0] ?? null;

  if (sessions.length === 0) {
    return (
      <div className="card pad center">
        <h1 className="sr-only">{t('analytics.pageTitle')}</h1>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
          <Mascot mood={mood} size={110} />
        </div>
        <EmptyState
          icon="barChart"
          title="No study data yet"
          hint="finish one focus session and your stats will bloom here~"
          action={
            <button type="button" className="btn btn-primary" onClick={() => navigate('/focus')}>
              <Ic name="timer" size={15} className="inline-icon" /> start first session
            </button>
          }
        />
      </div>
    );
  }

  const cmpClass = comparison.delta > 0 ? 'cmp-up' : comparison.delta < 0 ? 'cmp-down' : 'cmp-flat';
  const cmpEmoji: IconName = comparison.delta > 0 ? 'trend' : comparison.delta < 0 ? 'trendingDown' : 'minus';
  const trendCmpClass = comparison.delta > 0 ? 'cmp-up' : comparison.delta < 0 ? 'cmp-down' : 'cmp-flat';
  const trendCmpText =
    comparison.delta > 0
      ? t('analytics.trendUp', { n: comparison.delta })
      : comparison.delta < 0
        ? t('analytics.trendDown', { n: Math.abs(comparison.delta) })
        : t('analytics.trendFlat');

  return (
    <div className="stack" style={{ gap: 16 }}>
      <h1 className="sr-only">{t('analytics.pageTitle')}</h1>
      <div className="grid">
        <StatCard icon="clock" value={formatMinutes(stats.totalMinutes)} label="total studied" />
        <StatCard icon="timer" value={`${stats.totalSessions}`} label="focus sessions" />
        <StatCard icon="flame" value={`${streak.current}d`} label={`best streak ${streak.best}d`} />
        <StatCard icon="trend" value={`${avg7}m`} label="avg / day (last 7)" />
      </div>

      <div className="grid wide">
        <div className="card pad">
          <div className="card-title">{t('analytics.completionTitle')}</div>
          <div className="row" style={{ gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="stat-value" style={{ fontSize: 34 }}>
              {completion.rate}%
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <ProgressBar pct={completion.rate} />
              <div className="small muted" style={{ marginTop: 7 }}>
                {t('analytics.tasks30d', { done: completion.done, total: completion.total })}
              </div>
            </div>
          </div>
          <div className="row wrap" style={{ gap: 8, marginTop: 14 }}>
            <span className="tag">{t('analytics.activeDays', { n: active30 })}</span>
            <span className="tag">{t('analytics.avgPerDay', { n: avgActive })}</span>
            <span className="tag">{t('analytics.streakChip', { n: streak.current })}</span>
          </div>
        </div>

        <div className="card pad">
          <div className="card-title">{t('analytics.memoryTitle')}</div>
          <div className="mini-grid">
            <div className="mini-stat">
              <div className="mini-value">{due}</div>
              <div className="mini-label">{t('analytics.dueToday')}</div>
            </div>
            <div className="mini-stat">
              <div className="mini-value">{flashcards.length}</div>
              <div className="mini-label">{t('analytics.totalCards')}</div>
            </div>
            <div className="mini-stat">
              <div className="mini-value">{retention}%</div>
              <div className="mini-label">{t('analytics.retention')}</div>
            </div>
            <div className="mini-stat">
              <div className="mini-value">{reviews7}</div>
              <div className="mini-label">{t('analytics.reviews7d')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid wide">
        <div className="card pad">
          <div className="card-title">
            <Ic name="calendar" size={15} className="inline-icon" /> last 14 days
            <span className="spacer" />
            <span className={`tag ${cmpClass}`}>
              <Ic name={cmpEmoji} size={16} /> {comparison.delta > 0 ? '+' : ''}
              {comparison.delta}% vs last week
            </span>
          </div>
          <div className="bar-chart" role="img" aria-label="study minutes for the last 14 days">
            {last14.map((day) => (
              <div
                key={day.date}
                className={`bar ${day.minutes === 0 ? 'empty' : ''}`}
                style={{ height: `${Math.max(4, (day.minutes / max14) * 100)}%` }}
                title={`${day.date}: ${day.minutes} min`}
              >
                <span>{day.date.slice(8)}</span>
              </div>
            ))}
          </div>
          <div className="row between small muted" style={{ marginTop: 26 }}>
            <span>this week {formatMinutes(comparison.thisWeek)}</span>
            <span>last week {formatMinutes(comparison.lastWeek)}</span>
          </div>
        </div>

        <div className="card pad">
          <div className="card-title"><Ic name="book" size={16} className="inline-icon" /> time by subject</div>
          {shares.map((row) => {
            const w = Math.max(3, (row.minutes / maxSubject) * 100);
            return (
              <div className="hbar-row" key={row.name}>
                <span className="hbar-name">
                  <span className="dot" style={{ background: row.color }} />
                  {row.name}
                </span>
                <span className="hbar-track">
                  <span className="hbar-fill" style={{ width: `${w}%`, background: row.color }} />
                </span>
                <span className="muted" style={{ textAlign: 'right' }}>
                  {formatMinutes(row.minutes)} · {row.pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid wide">
        <div className="card pad" style={{ gridColumn: '1 / -1' }}>
          <div className="card-title">
            {t('analytics.trendTitle')}
            <span className="spacer" />
            <span className="pill small muted">
              <span className="trend-swatch" />
              {t('analytics.avg7Legend')}
            </span>
          </div>
          <div className="trend-wrap">
            <span className="trend-ymax">{formatMinutes(maxTrend)}</span>
            <svg
              className="trend-svg"
              viewBox="0 0 600 180"
              preserveAspectRatio="none"
              role="img"
              aria-label={t('analytics.trendTitle')}
            >
              <line className="trend-base" x1={0} y1={174} x2={600} y2={174} vectorEffect="non-scaling-stroke" />
              {trend.map((d, i) => {
                const h = d.minutes <= 0 ? 3 : Math.max(3, (d.minutes / maxTrend) * 166);
                return (
                  <rect
                    key={d.date}
                    className={`trend-bar ${d.minutes <= 0 ? 'zero' : ''}`}
                    x={i * 20 + 3.5}
                    y={174 - h}
                    width={13}
                    height={h}
                    rx={3}
                  >
                    <title>{`${d.date}: ${d.minutes} min`}</title>
                  </rect>
                );
              })}
              <polyline className="trend-avg" points={trendLine} vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="trend-x">
              {trend.map((d, i) => (
                <span key={d.date}>{i % 5 === 0 ? d.date.slice(8) : ''}</span>
              ))}
            </div>
          </div>
          <div className="row" style={{ marginTop: 12, gap: 8, flexWrap: 'wrap' }}>
            <span className={`tag ${trendCmpClass}`}>{trendCmpText}</span>
          </div>
        </div>
      </div>

      <div className="grid wide">
        <div className="card pad">
          <div className="card-title">
            {t('analytics.weekdayTitle')}
            <span className="spacer" />
            {bestWeekRow && <span className="tag">{t('analytics.bestDay', { day: bestWeekRow.day })}</span>}
          </div>
          <div className="dist-chart" role="img" aria-label="study minutes by weekday">
            {weekDist.map((d) => (
              <div className="dist-col" key={d.day}>
                <div className="dist-plot">
                  <span
                    className={`dist-bar ${bestWeekRow && d.day === bestWeekRow.day ? 'top' : ''}`}
                    style={{ height: `${Math.max(4, (d.minutes / weekMax) * 100)}%` }}
                    title={`${d.day}: ${d.minutes} min`}
                  />
                </div>
                <span className="dist-label">{d.day}</span>
              </div>
            ))}
          </div>
          {!bestWeekRow && (
            <p className="small muted center" style={{ marginTop: 12 }}>
              {t('analytics.noDataYet')}
            </p>
          )}
        </div>

        <div className="card pad">
          <div className="card-title">
            {t('analytics.hourTitle')}
            <span className="spacer" />
            {topHourRow && (
              <span className="tag">{t('analytics.goldenHour', { hour: topHourRow.hour })}</span>
            )}
          </div>
          <div className="dist-chart hours" role="img" aria-label="study minutes by hour of day">
            {hourDist.map((d) => (
              <div className="dist-col" key={d.hour}>
                <div className="dist-plot">
                  <span
                    className={`dist-bar ${topHourRow && d.hour === topHourRow.hour ? 'top' : ''}`}
                    style={{ height: `${Math.max(4, (d.minutes / hourMax) * 100)}%` }}
                    title={`${String(d.hour).padStart(2, '0')}:00 · ${d.minutes} min`}
                  />
                </div>
                <span className="dist-label">{d.hour % 6 === 0 ? d.hour : ''}</span>
              </div>
            ))}
          </div>
          {!topHourRow && (
            <p className="small muted center" style={{ marginTop: 12 }}>
              {t('analytics.noDataYet')}
            </p>
          )}
        </div>
      </div>

      <div className="grid wide">
        <div className="card pad">
          <div className="card-title"><Ic name="calendarDays" size={16} className="inline-icon" /> focus rhythm · 12 weeks</div>
          <div className="heat-grid" role="img" aria-label="focus session heatmap for the last 12 weeks">
            {heat.map((cell) => (
              <span
                key={cell.date}
                className={`heat-cell l${heatLevel(cell.minutes)} ${cell.future ? 'future' : ''}`}
                title={`${cell.date} · ${cell.minutes} min`}
              />
            ))}
          </div>
          <div className="row between small muted" style={{ marginTop: 12 }}>
            <span>one square = one day</span>
            <span className="row heat-legend" style={{ gap: 4 }}>
              less
              {[0, 1, 2, 3, 4, 5].map((lv) => (
                <span key={lv} className={`heat-cell l${lv}`} />
              ))}
              more
            </span>
          </div>
        </div>

        <div className="card pad">
          <div className="card-title"><Ic name="sparkles" size={15} className="inline-icon" /> highlights</div>
          <div className="hl-row">
            <span className="small muted"><Ic name="timer" size={15} className="inline-icon" /> longest focus</span>
            <span className="small bold">
              {longest
                ? `${formatMinutes(longest.minutes)} · ${
                    subjects.find((s) => s.id === longest.subjectId)?.name ?? 'No subject'
                  }`
                : '—'}
            </span>
          </div>
          <div className="hl-row">
            <span className="small muted"><Ic name="calendar" size={15} className="inline-icon" /> favorite weekday</span>
            <span className="small bold">
              {weekday.name}
              {weekday.minutes > 0 ? ` · ${formatMinutes(weekday.minutes)}` : ''}
            </span>
          </div>
          <div className="hl-row">
            <span className="small muted"><Ic name="heart" size={15} className="inline-icon" /> top subject</span>
            <span className="small bold">
              {favorite ? `${favorite.name} · ${formatMinutes(favorite.minutes)}` : '—'}
            </span>
          </div>
          <div className="hl-row">
            <span className="small muted"><Ic name="star" size={14} className="inline-icon" /> best day</span>
            <span className="small bold">{bestDay ? `${prettyDate(bestDay.date)} · ${formatMinutes(bestDay.minutes)}` : '—'}</span>
          </div>
          <div className="divider" />
          <div className="row" style={{ gap: 16, alignItems: 'center' }}>
            <PlantCompanion stage={plant.current.index} pct={plant.pct} size={110} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="stat-value" style={{ fontSize: 18 }}>
                <span aria-hidden="true">{plant.current.emoji}</span> {plant.current.label}
              </div>
              <p className="small muted" style={{ margin: '6px 0 10px' }}>
                {plant.nextAt
                  ? `${plant.nextAt - stats.totalMinutes} more minutes to grow~`
                  : <>your plant is fully bloomed! <Ic name="flower" size={15} className="inline-icon" /></>}
              </p>
              <ProgressBar pct={plant.pct} tiny />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
