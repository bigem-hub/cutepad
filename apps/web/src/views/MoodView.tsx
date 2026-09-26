import { useEffect, useMemo, useState } from 'react';
import {
  avgMinutesByMood,
  minutesOn,
  MOODS,
  moodDef,
  moodDistribution,
  moodSeries,
  moodStreak,
  todayKey,
  todayMood,
  useApp,
  type MascotMood,
} from '@cutepad/core';
import { EmptyState, MascotDock, MoodFace } from '@cutepad/ui';
import { useT } from '../i18n';
import './MoodView.css';

const MASCOT_BY_LEVEL: Record<number, MascotMood> = {
  1: 'sad',
  2: 'sleep',
  3: 'idle',
  4: 'study',
  5: 'cheer',
};

export default function MoodView() {
  const t = useT();
  const moods = useApp((s) => s.moods);
  const sessions = useApp((s) => s.sessions);
  const logMood = useApp((s) => s.logMood);
  const deleteMood = useApp((s) => s.deleteMood);

  const todayEntry = todayMood(moods);
  const [draftNote, setDraftNote] = useState(todayEntry?.note ?? '');

  useEffect(() => {
    setDraftNote(todayEntry?.note ?? '');
  }, [todayEntry]);

  const series = useMemo(() => moodSeries(moods, 30), [moods]);
  const streak = useMemo(() => moodStreak(moods), [moods]);
  const avgs = useMemo(() => avgMinutesByMood(moods, sessions), [moods, sessions]);
  const dist = useMemo(() => moodDistribution(moods), [moods]);

  const todayDef = todayEntry ? moodDef(todayEntry.level) : null;
  const mascotMood: MascotMood = todayEntry ? (MASCOT_BY_LEVEL[todayEntry.level] ?? 'idle') : 'idle';
  const todayKeyStr = todayKey();
  const totalLogged = moods.length;
  const maxAvg = Math.max(1, ...avgs.map((r) => r.avgMinutes));

  const bestRows = avgs.filter((r) => r.days > 0 && r.avgMinutes > 0);
  const best = bestRows.length > 0 ? bestRows.reduce((a, b) => (b.avgMinutes > a.avgMinutes ? b : a)) : null;

  const pickMood = (level: number) => {
    const changed = !todayEntry || todayEntry.level !== level;
    logMood(level, draftNote.trim());
    if (changed) useApp.getState().pushEvent('celebrate', t('mood.celebrateEvent'));
  };

  const saveNote = () => {
    if (!todayEntry) return;
    const next = draftNote.trim();
    if (next === todayEntry.note) return;
    logMood(todayEntry.level, next);
  };

  const removeToday = () => {
    deleteMood(todayKey());
    setDraftNote('');
  };

  const stateText = todayEntry
    ? t('mood.stateSaved', { emoji: todayDef?.emoji ?? '', name: t(`mood.name${todayEntry.level}`) })
    : t('mood.stateTap');

  const dockMessage = todayEntry
    ? t('mood.dockSaved', { name: t(`mood.name${todayEntry.level}`) })
    : t('mood.dockAsk');

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head">
        <div>
          <div className="page-title" role="heading" aria-level={1}>{t('mood.title')}</div>
          <div className="page-sub">{t('mood.sub')}</div>
        </div>
      </div>

      <div className="card pad">
        <MascotDock mood={mascotMood} message={dockMessage} size={92} />
        <div className="mood-faces" style={{ marginTop: 14 }}>
          {MOODS.map((m) => (
            <MoodFace
              key={m.level}
              level={m.level}
              size={56}
              selected={todayEntry?.level === m.level}
              onClick={() => pickMood(m.level)}
              title={t(`mood.name${m.level}`)}
            />
          ))}
        </div>
        <input
          className="input"
          style={{ marginTop: 14 }}
          value={draftNote}
          placeholder={t('mood.notePlaceholder')}
          aria-label={t('mood.notePlaceholder')}
          onChange={(e) => setDraftNote(e.target.value)}
          onBlur={saveNote}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
        <div className="row wrap" style={{ marginTop: 10, gap: 10 }}>
          <strong className="small" role="status">
            {stateText}
          </strong>
          <span className="spacer" />
          {todayEntry && (
            <button type="button" className="btn btn-sm btn-danger" onClick={removeToday}>
              <span aria-hidden="true">🗑</span> {t('mood.removeToday')}
            </button>
          )}
        </div>
      </div>

      <div className="card pad">
        <div className="card-title">
          <span aria-hidden="true">📅</span> {t('mood.last30')}
          <span className="spacer" />
          {streak > 0 && <span className="tag">{t('mood.streak', { n: streak })}</span>}
        </div>
        <div className="mood-days">
          {series.map((cell) => {
            const def = cell.level !== null ? moodDef(cell.level) : null;
            const mins = minutesOn(sessions, cell.date);
            const dayLabel = t('mood.dayTooltip', { date: cell.date, n: mins });
            return (
              <div
                key={cell.date}
                className="mood-day"
                style={{
                  background: def?.color,
                  boxShadow: cell.date === todayKeyStr ? '0 0 0 2px var(--accent)' : undefined,
                }}
                title={dayLabel}
                role="img"
                aria-label={dayLabel}
              >
                {def ? def.emoji : '·'}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid wide">
        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">🎯</span> {t('mood.focusTitle')}
            <span className="spacer" />
            {best && <span className="tag">{t('mood.bestFocus')}</span>}
          </div>
          {totalLogged === 0 ? (
            <EmptyState emoji="🎯" title={t('mood.emptyTitle')} hint={t('mood.emptyHint')} />
          ) : (
            avgs.map((row) => (
              <div key={row.level} className="mood-bar-row">
                <MoodFace level={row.level} size={30} title={t(`mood.name${row.level}`)} />
                <span className="mood-bar-track">
                  <span
                    className="mood-bar-fill"
                    style={{
                      width: `${Math.round((row.avgMinutes / maxAvg) * 100)}%`,
                      background: moodDef(row.level).color,
                    }}
                  />
                </span>
                <span className="mood-bar-label">{t('mood.avgMin', { n: row.avgMinutes })}</span>
              </div>
            ))
          )}
        </div>

        <div className="card pad">
          <div className="card-title"><span aria-hidden="true">🌈</span> {t('mood.distTitle')}</div>
          {totalLogged === 0 ? (
            <EmptyState emoji="🌈" title={t('mood.emptyTitle')} hint={t('mood.emptyHint')} />
          ) : (
            dist
              .filter((row) => row.count > 0)
              .map((row) => {
                const def = moodDef(row.level);
                const pct = Math.round((row.count / totalLogged) * 100);
                return (
                  <div key={row.level} className="mood-bar-row">
                    <span
                      className="mood-bar-face"
                      style={{ background: def.color }}
                      role="img"
                      aria-label={t(`mood.name${row.level}`)}
                    >
                      {def.emoji}
                    </span>
                    <span className="mood-bar-track">
                      <span
                        className="mood-bar-fill"
                        style={{ width: `${pct}%`, background: def.color }}
                      />
                    </span>
                    <span className="mood-bar-label">{t('mood.distLabel', { count: row.count, pct })}</span>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}
