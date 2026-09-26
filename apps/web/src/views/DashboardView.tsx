import { useMemo, useState } from 'react';
import {
  aiSuggestSchedule,
  dailyMinutes,
  dayKey,
  deriveStats,
  moodStreak,
  plantProgress,
  todayMood,
  useApp,
  type MascotMood,
} from '@cutepad/core';
import { EmptyState, Mascot, MoodFace, PlantCompanion, ProgressBar } from '@cutepad/ui';
import { mascotLine, useHashRoute, useMascotMood, useNow } from '../hooks';

const DAILY_GOAL = 60;

function StatCard({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <div className="card stat-card">
      <div className="stat-icon" aria-hidden="true">{emoji}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export default function DashboardView() {
  const [, navigate] = useHashRoute();
  const now = useNow(30000);
  const mood = useMascotMood();
  const sessions = useApp((s) => s.sessions);
  const tasks = useApp((s) => s.tasks);
  const notes = useApp((s) => s.notes);
  const blocks = useApp((s) => s.blocks);
  const reminders = useApp((s) => s.reminders);
  const mascotName = useApp((s) => s.settings.mascotName);
  const addTask = useApp((s) => s.addTask);
  const addNote = useApp((s) => s.addNote);
  const moods = useApp((s) => s.moods);
  const logMood = useApp((s) => s.logMood);

  const [line] = useState(() => mascotLine(mood as MascotMood));
  const stats = useMemo(
    () => deriveStats({ sessions, tasks, notesCount: notes.length }),
    [sessions, tasks, notes.length],
  );
  const plant = plantProgress(stats.totalMinutes);
  const week = useMemo(() => dailyMinutes(sessions, 7), [sessions]);
  const maxWeek = Math.max(30, ...week.map((w) => w.minutes));

  const today = dayKey(now);
  const todaysBlocks = blocks
    .filter((b) => b.date === today)
    .sort((a, b) => a.startMin - b.startMin);
  const dueTasks = tasks
    .filter((t) => !t.done && t.due)
    .sort((a, b) => (a.due! < b.due! ? -1 : 1))
    .slice(0, 4);
  const openTasks = tasks.filter((t) => !t.done).length;
  const nextReminder = reminders
    .filter((r) => r.enabled)
    .sort((a, b) => (a.time < b.time ? -1 : 1))[0];

  const hhmm = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${`${m}`.padStart(2, '0')} ${suffix}`;
  };

  const daysUntil = (due: string) => {
    const [y, m, d] = due.split('-').map(Number);
    const target = new Date(y, m - 1, d).getTime();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.round((target - startOfToday) / 86400000);
  };

  const goalPct = Math.min(100, (stats.minutesToday / DAILY_GOAL) * 100);
  const todayMoodEntry = todayMood(moods);
  const moodDays = moodStreak(moods);
  const suggestions = useMemo(() => aiSuggestSchedule(useApp.getState()), [sessions, tasks, notes, moods]);

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card pad" style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <Mascot mood={mood} size={120} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontSize: 24 }}>{mascotName} says hi!<span aria-hidden="true"> 🌸</span></h1>
          <p style={{ margin: '6px 0 14px', fontWeight: 700 }}>{line}</p>
          <div className="row between" style={{ marginBottom: 6 }}>
            <span className="small bold">daily goal · {stats.minutesToday}/{DAILY_GOAL} min</span>
            <span className="small muted">{Math.round(goalPct)}%</span>
          </div>
          <ProgressBar pct={goalPct} />
          <div className="row wrap" style={{ marginTop: 14 }}>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/focus')}>
              <span aria-hidden="true">🍅 </span>start focus
            </button>
            <button
              type="button"
              className="btn btn-soft"
              onClick={() => {
                addNote({});
                navigate('/notes');
              }}
            >
              <span aria-hidden="true">✏️ </span>new note
            </button>
            <button
              type="button"
              className="btn btn-soft"
              onClick={() => {
                addTask({ title: '' });
                navigate('/tasks');
              }}
            >
              <span aria-hidden="true">✅ </span>new task
            </button>
          </div>
        </div>
      </div>

      <div className="grid">
        <StatCard emoji="🔥" value={`${stats.streak}`} label="day streak" />
        <StatCard emoji="🌸" value={`${stats.minutesToday}m`} label="studied today" />
        <StatCard emoji="🍅" value={`${stats.sessionsToday}`} label="sessions today" />
        <StatCard emoji="📝" value={`${stats.notesCount}`} label="notes written" />
      </div>

      <div className="grid wide">
        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">😊 </span>how are you feeling?
            <span className="spacer" />
            <button type="button" className="btn btn-sm btn-soft" onClick={() => navigate('/mood')}>
              mood log
            </button>
          </div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5].map((level) => (
              <MoodFace
                key={level}
                level={level}
                size={46}
                selected={todayMoodEntry?.level === level}
                onClick={() => logMood(level)}
              />
            ))}
            <span className="small muted" style={{ marginLeft: 6 }}>
              {todayMoodEntry
                ? `today: ${['😣', '😴', '😐', '😊', '🌸'][todayMoodEntry.level - 1]} logged${moodDays > 1 ? ` · ${moodDays}-day mood streak` : ''}`
                : 'tap to log today’s mood 💗'}
            </span>
          </div>
        </div>

        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">✨ </span>smart ideas
            <span className="spacer" />
            <button type="button" className="btn btn-sm btn-soft" onClick={() => navigate('/smart')}>
              open
            </button>
          </div>
          {suggestions.length === 0 ? (
            <EmptyState emoji="🧠" title="All caught up!" hint="finish tasks to get study suggestions" />
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {suggestions.slice(0, 3).map((sug) => (
                <div key={sug.id} className="row" style={{ gap: 10 }}>
                  <span className="tag">{sug.date.slice(5)}</span>
                  <span className="small bold">{sug.title}</span>
                  <span className="spacer" />
                  <span className="muted small">{sug.durationMin}m</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid wide">
        <div className="card pad">
          <div className="card-title"><span aria-hidden="true">🌱 </span>study garden</div>
          <div className="row" style={{ gap: 16, alignItems: 'center' }}>
            <PlantCompanion stage={plant.current.index} pct={plant.pct} size={130} />
            <div style={{ flex: 1 }}>
              <div className="stat-value" style={{ fontSize: 19 }}>
                {plant.current.emoji} {plant.current.label}
              </div>
              <p className="small muted" style={{ margin: '6px 0 10px' }}>
                {plant.nextAt
                  ? `${plant.nextAt - stats.totalMinutes} more minutes to grow the next stage~`
                  : 'your garden is fully bloomed! 🌸'}
              </p>
              <ProgressBar pct={plant.pct} tiny />
              <div className="row between small muted" style={{ marginTop: 8 }}>
                <span>total {Math.floor(stats.totalMinutes / 60)}h studied</span>
                <span>best streak {stats.bestStreak}d</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card pad">
          <div className="card-title"><span aria-hidden="true">📅 </span>last 7 days</div>
          <div
            className="bar-chart"
            role="img"
            aria-label={week.map((day) => `${day.date}: ${day.minutes} minutes`).join(', ')}
          >
            {week.map((day) => (
              <div
                key={day.date}
                className={`bar ${day.minutes === 0 ? 'empty' : ''}`}
                style={{ height: `${Math.max(4, (day.minutes / maxWeek) * 100)}%` }}
                title={`${day.date}: ${day.minutes} min`}
              >
                <span>{day.date.slice(8)}</span>
              </div>
            ))}
          </div>
          <div className="row between small muted" style={{ marginTop: 26 }}>
            <span>this week: {Math.round(week.reduce((s, d) => s + d.minutes, 0) / 60 * 10) / 10}h</span>
            <span>{openTasks} open tasks</span>
          </div>
        </div>
      </div>

      <div className="grid wide">
        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">🗓️ </span>today’s study blocks
            <span className="spacer" />
            <button type="button" className="btn btn-sm btn-soft" onClick={() => navigate('/planner')}>
              open planner
            </button>
          </div>
          {todaysBlocks.length === 0 ? (
            <EmptyState emoji="🫧" title="No blocks yet" hint="drag some study time into today!" />
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {todaysBlocks.map((b) => (
                <div key={b.id} className="row" style={{ gap: 10 }}>
                  <span className="dot" style={{ background: b.color, width: 14, height: 14 }} />
                  <strong className="small">{hhmm(b.startMin)}</strong>
                  <span className="small">{b.title}</span>
                  <span className="spacer" />
                  <span className="muted small">{b.durationMin}m</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">⏰ </span>deadlines & reminders
            <span className="spacer" />
            <button type="button" className="btn btn-sm btn-soft" onClick={() => navigate('/tasks')}>
              tasks
            </button>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {dueTasks.length === 0 && !nextReminder && (
              <EmptyState emoji="🌈" title="All clear!" hint="no deadlines haunting you~" />
            )}
            {dueTasks.map((t) => {
              const days = daysUntil(t.due!);
              return (
                <div key={t.id} className="row" style={{ gap: 10 }}>
                  <span className="tag" style={{ background: days <= 0 ? '#ffd7e3' : undefined }}>
                    {days < 0 ? `${-days}d late` : days === 0 ? 'today!' : `${days}d left`}
                  </span>
                  <span className="small bold">{t.title}</span>
                </div>
              );
            })}
            {nextReminder && (
              <div className="row" style={{ gap: 10 }}>
                <span className="tag"><span aria-hidden="true">🔔 </span>{nextReminder.time}</span>
                <span className="small">{nextReminder.title}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
