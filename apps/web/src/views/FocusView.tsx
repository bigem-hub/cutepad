import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AMBIENT_TRACKS,
  formatMinutes,
  minutesToday,
  playChime as playCoreChime,
  sessionsToday,
  useApp,
  type SessionKind,
} from '@cutepad/core';
import { EmptyState, Ic, MascotDock, RingProgress, type IconName } from '@cutepad/ui';
import { mascotLine, notifyUser, useMascotMood } from '../hooks';
import { setFocusPresence } from '../lib/presence';
import './FocusView.css';

type Phase = 'focus' | 'short' | 'long';

const PHASE_LABEL: Record<Phase, string> = {
  focus: 'Focus',
  short: 'Short Break',
  long: 'Long Break',
};

const KIND_ICON: Record<SessionKind, IconName> = { focus: 'timer', break: 'coffee', custom: 'clock' };

const TIPS: { emoji: string; text: string }[] = [
  { emoji: '💧', text: 'sip some water — your brain loves hydration!' },
  { emoji: '🌬️', text: 'unclench your jaw and drop those shoulders~' },
  { emoji: '👀', text: '20-20-20 rule: look 20ft away for 20 seconds' },
  { emoji: '🌱', text: 'roll your neck slowly, like a happy sunflower' },
];

const DEFAULT_TITLE = 'Cutepad · kawaii notepad & study buddy';

function mmss(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${`${m}`.padStart(2, '0')}:${`${r}`.padStart(2, '0')}`;
}

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function playChime(): void {
  playCoreChime();
}

function ignoreKeyTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as HTMLElement).tagName !== 'string') return false;
  const el = target as HTMLElement;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || el.isContentEditable;
}

export default function FocusView() {
  const mood = useMascotMood();
  const subjects = useApp((s) => s.subjects);
  const sessions = useApp((s) => s.sessions);
  const pomodoro = useApp((s) => s.settings.pomodoro);
  const ambientCfg = useApp((s) => s.settings.ambient);
  const guardCfg = useApp((s) => s.settings.guard);
  const setSettings = useApp((s) => s.setSettings);
  const setMood = useApp((s) => s.setMood);
  const logSession = useApp((s) => s.logSession);

  const [phase, setPhase] = useState<Phase>('focus');
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [remaining, setRemaining] = useState(pomodoro.work * 60);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [tipIdx, setTipIdx] = useState(0);

  const endedRef = useRef(false);
  const lastPhaseRef = useRef<Phase>('focus');

  const durationOf = (p: Phase) =>
    (p === 'focus' ? pomodoro.work : p === 'short' ? pomodoro.shortBreak : pomodoro.longBreak) * 60;
  const total = durationOf(phase);
  const pct = total > 0 ? ((total - remaining) / total) * 100 : 0;
  const inBreak = phase !== 'focus';
  const filled = Math.min(cycle, Math.max(1, pomodoro.longEvery));

  const line = useMemo(() => mascotLine(inBreak ? 'cheer' : 'study'), [inBreak]);
  const recent = useMemo(() => sessions.slice(-8).reverse(), [sessions]);
  const todayMin = minutesToday(sessions);
  const todayCount = sessionsToday(sessions);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running || remaining > 0) {
      endedRef.current = false;
      return;
    }
    if (endedRef.current) return;
    endedRef.current = true;
    if (phase === 'focus') {
      logSession({ subjectId, minutes: pomodoro.work, kind: 'focus' });
      if (pomodoro.chime) playChime();
      notifyUser('Break time 🌸', 'stretch, sip water, rest those eyes~');
      const next = cycle + 1;
      setCycle(next);
      if (next >= pomodoro.longEvery) {
        setPhase('long');
        setRemaining(pomodoro.longBreak * 60);
        setRunning(true);
      } else if (pomodoro.autoBreak) {
        setPhase('short');
        setRemaining(pomodoro.shortBreak * 60);
        setRunning(true);
      } else {
        setRemaining(0);
        setRunning(false);
      }
    } else {
      notifyUser('Ready to focus? 🍅', 'break is over — back to the tomatoes~');
      setMood('idle');
      if (phase === 'long') setCycle(0);
      setPhase('focus');
      setRemaining(pomodoro.work * 60);
      setRunning(false);
    }
  }, [running, remaining, phase, pomodoro, subjectId, cycle, logSession, setMood]);

  useEffect(() => {
    if (!running) return;
    setMood(phase === 'focus' ? 'study' : 'cheer');
    return () => setMood('idle');
  }, [running, phase, setMood]);

  useEffect(() => {
    useApp.getState().setGuardActive(running && phase === 'focus' && guardCfg.enabled);
    return () => useApp.getState().setGuardActive(false);
  }, [running, phase, guardCfg.enabled]);

  useEffect(() => {
    document.title = running ? `Cutepad · ${mmss(remaining)}` : DEFAULT_TITLE;
  }, [running, remaining]);

  useEffect(() => {
    if (!running) {
      setFocusPresence(null);
      return;
    }
    setFocusPresence({
      details:
        phase === 'focus' ? '🍅 Focus session' : phase === 'short' ? '☕ Short break' : '🌿 Long break',
      state: `${mmss(remaining)} left`,
      startMs: Date.now() - (total - remaining) * 1000,
    });
  }, [running, phase, remaining, total]);

  useEffect(() => () => setFocusPresence(null), []);

  useEffect(() => {
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, []);

  useEffect(() => {
    if (lastPhaseRef.current === phase) return;
    lastPhaseRef.current = phase;
    setTipIdx((i) => (i + 1) % TIPS.length);
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (ignoreKeyTarget(e.target)) return;
      e.preventDefault();
      setRunning((r) => !r);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleRun = () => {
    if (running) {
      setRunning(false);
      return;
    }
    if (remaining <= 0 && phase === 'focus') setRemaining(pomodoro.work * 60);
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    endedRef.current = false;
    setPhase('focus');
    setCycle(0);
    setRemaining(pomodoro.work * 60);
  };

  const skip = () => {
    if (phase === 'focus') {
      const elapsed = durationOf('focus') - remaining;
      const logged = remaining > 0 && elapsed >= 60;
      if (logged) {
        logSession({ subjectId, minutes: Math.floor(elapsed / 60), kind: 'focus' });
      }
      const next = logged ? cycle + 1 : cycle;
      const long = next >= pomodoro.longEvery;
      setCycle(next);
      setPhase(long ? 'long' : 'short');
      setRemaining((long ? pomodoro.longBreak : pomodoro.shortBreak) * 60);
      return;
    }
    if (phase === 'long') setCycle(0);
    setPhase('focus');
    setRemaining(pomodoro.work * 60);
  };

  const trackId = ambientCfg.track ?? 'none';
  const pickTrack = (id: string) => setSettings({ ambient: { track: id, volume: ambientCfg.volume } });
  const pickVolume = (v: number) => setSettings({ ambient: { track: ambientCfg.track, volume: v } });

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="grid wide">
        <div className="card pad">
          <div className="card-title" role="heading" aria-level={1}>
            <Ic name="timer" size={17} /> pomodoro focus
            <span className="spacer" />
            <span className="tag" role="status">{running ? '● live' : <><Ic name="pause" size={13} /> paused</>}</span>
          </div>
          <div className="focus-stage">
            <select
              className="select"
              style={{ width: 230 }}
              value={subjectId ?? ''}
              onChange={(e) => setSubjectId(e.target.value || null)}
              aria-label="Subject for this session"
            >
              <option value="">🍃 No subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.name}
                </option>
              ))}
            </select>

            <div className={`focus-ring ${running ? 'is-running' : ''}`}>
              <RingProgress pct={pct} size={260} stroke={16}>
                <div className="phase-label">{PHASE_LABEL[phase]}</div>
                <div className="time-display">{mmss(remaining)}</div>
                <div className="cycle-dots" role="img" aria-label={`${filled} of ${pomodoro.longEvery} pomodoros`}>
                  {Array.from({ length: Math.max(1, pomodoro.longEvery) }, (_, i) => (
                    <span key={i} className={`cycle-dot ${i < filled ? 'on' : ''}`} />
                  ))}
                </div>
              </RingProgress>
            </div>

            <div className="row wrap" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn btn-primary" onClick={toggleRun}>
                {running ? <Ic name="pause" size={16} /> : <Ic name="play" size={16} />} {running ? 'pause' : 'start'}
              </button>
              <button type="button" className="btn btn-soft" onClick={reset} title="Reset timer" aria-label="Reset timer">
                ↺ reset
              </button>
              <button type="button" className="btn btn-soft" onClick={skip} title="Skip to next phase" aria-label="Skip to next phase">
                <Ic name="skipForward" size={15} /> skip
              </button>
            </div>

            <div className="focus-mascot">
              <MascotDock mood={mood} message={line} size={110} />
              <span className="focus-chip">you can do it! 💪</span>
            </div>
          </div>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          {inBreak ? (
            <div className="card pad">
              <div className="card-title"><Ic name="sparkle" size={17} /> self-care break</div>
              <div className="focus-tip">
                <span className="tip-emoji" aria-hidden="true">{TIPS[tipIdx].emoji}</span>
                <p className="small bold" style={{ margin: 0 }}>
                  {TIPS[tipIdx].text}
                </p>
              </div>
              <p className="small muted" style={{ marginBottom: 0 }}>
                tip {tipIdx + 1}/{TIPS.length} · a new one every phase
              </p>
            </div>
          ) : (
            <div className="card pad">
              <div className="card-title"><Ic name="flower" size={17} /> how this works</div>
              <div className="row wrap" style={{ gap: 8 }}>
                <span className="tag"><Ic name="timer" size={14} /> {pomodoro.work}m focus</span>
                <span className="tag"><Ic name="coffee" size={14} /> {pomodoro.shortBreak}m short</span>
                <span className="tag"><Ic name="moon" size={14} /> {pomodoro.longBreak}m long</span>
                <span className="tag">every {pomodoro.longEvery} <Ic name="timer" size={14} /></span>
                <span className="tag">{pomodoro.autoBreak ? 'auto breaks on' : 'manual breaks'}</span>
                <span className="tag"><><Ic name={pomodoro.chime ? 'bell' : 'bellOff'} size={14} /> {pomodoro.chime ? 'chime on' : 'chime off'}</></span>
              </div>
              <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
                press <span className="kbd">space</span> to start or pause · skipping a focus after 1m still logs it
              </p>
            </div>
          )}

          <div className="card pad">
            <div className="card-title"><Ic name="shield" size={17} /> focus guard</div>
            <div className="row between" style={{ gap: 10 }}>
              <span className="tag">
                {guardCfg.enabled
                  ? guardCfg.mode === 'shield'
                    ? 'on · shield'
                    : guardCfg.mode === 'snap'
                      ? 'on · snap back'
                      : 'on · nudge'
                  : 'off'}
              </span>
              <button type="button" className="btn btn-sm btn-soft" onClick={() => (window.location.hash = '/settings')}>
                <Ic name="settings" size={16} /> settings
              </button>
            </div>
            <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
              {guardCfg.enabled
                ? `watches for ${guardCfg.blockedApps.slice(0, 3).join(', ') || 'blocked apps'} while a focus session runs (desktop)`
                : 'block distracting apps & sites during focus — turn it on in settings'}
            </p>
          </div>

          <div className="card pad">
            <div className="card-title">
              <Ic name="clock" size={17} /> recent sessions
              <span className="spacer" />
              <span className="tag">
                {todayMin}m today · {todayCount}
              </span>
            </div>
            {recent.length === 0 ? (
              <EmptyState icon="timer" title="No sessions yet" hint="hit start and your first pomodoro lands here" />
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {recent.map((s) => {
                  const sub = subjects.find((x) => x.id === s.subjectId) ?? null;
                  return (
                    <div key={s.id} className="row" style={{ gap: 10 }}>
                      <span className="dot" style={{ background: sub?.color ?? '#e3d1ff' }} />
                      <span className="small bold">{sub?.name ?? 'No subject'}</span>
                      <span className="spacer" />
                      <span className="small muted">{relTime(s.startedAt)}</span>
                      <span className="tag">
                        <Ic name={KIND_ICON[s.kind]} size={14} /> {formatMinutes(s.minutes)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card pad">
        <div className="card-title"><Ic name="headphones" size={17} /> ambient vibes</div>
        <div className="row wrap" style={{ gap: 8 }}>
          {AMBIENT_TRACKS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`chip ${trackId === t.id ? 'active' : ''}`}
              onClick={() => pickTrack(t.id)}
              aria-pressed={trackId === t.id}
            >
              <span aria-hidden="true">{t.emoji}</span> {t.name}
            </button>
          ))}
          {trackId !== 'none' && (
            <span className="pill small">
              <span className="eq" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <Ic name="music" size={14} /> playing
            </span>
          )}
        </div>
        <div className="row" style={{ marginTop: 16, gap: 12 }}>
          <span className="small muted">volume</span>
          <input
            className="focus-range"
            type="range"
            min={0}
            max={100}
            value={Math.round(ambientCfg.volume * 100)}
            onChange={(e) => pickVolume(Number(e.target.value) / 100)}
            aria-label="Ambient volume"
          />
          <span className="small bold">{Math.round(ambientCfg.volume * 100)}%</span>
        </div>
        <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
          click tracks to layer cozy vibes with your focus session ✨
        </p>
      </div>
    </div>
  );
}
