import { useEffect, useState, type ChangeEvent } from 'react';
import {
  DEFAULT_SETTINGS,
  PALETTE,
  exportAllDataJson,
  fileToDataUrl,
  isDesktop,
  parseImportJson,
  performSync,
  readFileAsText,
  selectData,
  speak,
  stopSpeaking,
  ttsAvailable,
  ttsVoices,
  useApp,
  type BackgroundConfig,
  type Locale,
} from '@cutepad/core';
import {
  GRADIENT_SWATCHES,
  Modal,
  PATTERNS,
  Segmented,
  SOLID_SWATCHES,
  THEMES,
  Toggle,
  patternCss,
} from '@cutepad/ui';
import { ensureNotificationPermission, useHashRoute, useNow } from '../hooks';
import { useT } from '../i18n';
import './ExtraViews.css';

const SUBJECT_EMOJIS = ['📚', '🧮', '🔬', '📖', '🎨', '💬', '🧪', '🎵', '💻', '🏃', '🍳', '🌍'];

const GUARD_MODES = ['nudge', 'shield', 'snap', 'off'] as const;

type GuardMode = (typeof GUARD_MODES)[number];

const LOCALES: Locale[] = ['en', 'es', 'ja'];

const DYSLEXIA_SAMPLE_STYLE = {
  fontFamily: "'Comic Sans MS', 'Andika', 'OpenDyslexic', 'Trebuchet MS', Verdana, sans-serif",
  fontWeight: 700,
  letterSpacing: '0.06em',
  wordSpacing: '0.16em',
  lineHeight: 1.7,
  fontSize: 15,
} as const;

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
};

function relative(ts: number | null, now: number): string {
  if (!ts) return 'never';
  const diff = Math.max(0, now - ts);
  if (diff < 45000) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function bgForType(type: BackgroundConfig['type']): BackgroundConfig {
  switch (type) {
    case 'solid':
      return { type: 'solid', color: SOLID_SWATCHES[0] };
    case 'gradient':
      return { type: 'gradient', value: GRADIENT_SWATCHES[0] };
    case 'pattern':
      return { type: 'pattern', value: PATTERNS[0].id };
    default:
      return { type: 'image', value: '' };
  }
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="row" style={{ gap: 6 }}>
        <button
          type="button"
          className="btn btn-icon btn-soft"
          title={`decrease ${label}`}
          aria-label={`decrease ${label}`}
          onClick={() => onChange(clamp(value - 1, min, max))}
        >
          −
        </button>
        <input
          className="input"
          style={{ textAlign: 'center' }}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
        />
        <button
          type="button"
          className="btn btn-icon btn-soft"
          title={`increase ${label}`}
          aria-label={`increase ${label}`}
          onClick={() => onChange(clamp(value + 1, min, max))}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function SettingsView() {
  const [, navigate] = useHashRoute();
  const now = useNow(30000).getTime();
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);
  const subjects = useApp((s) => s.subjects);
  const reminders = useApp((s) => s.reminders);
  const updateReminder = useApp((s) => s.updateReminder);
  const addSubject = useApp((s) => s.addSubject);
  const updateSubject = useApp((s) => s.updateSubject);
  const removeSubject = useApp((s) => s.removeSubject);
  const importData = useApp((s) => s.importData);
  const resetAll = useApp((s) => s.resetAll);
  const syncStatus = useApp((s) => s.sync);
  const t = useT();

  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', icon: '📚', color: PALETTE[0] });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => ttsVoices());
  const [appsText, setAppsText] = useState(() => settings.guard.blockedApps.join(', '));
  const [sitesText, setSitesText] = useState(() => settings.guard.blockedSites.join(', '));

  const bg = settings.background;
  const pomo = settings.pomodoro;
  const sync = settings.sync;
  const ai = settings.ai;
  const guard = settings.guard;
  const access = settings.accessibility;

  const ttsReady = ttsAvailable();

  useEffect(() => {
    if (!ttsAvailable()) return;
    const reload = () => setVoices(ttsVoices());
    reload();
    window.speechSynthesis.addEventListener('voiceschanged', reload);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', reload);
  }, []);

  const parseList = (raw: string): string[] => [
    ...new Set(
      raw
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  const setGuardApps = (raw: string) => {
    setAppsText(raw);
    setSettings({ guard: { blockedApps: parseList(raw) } });
  };

  const setGuardSites = (raw: string) => {
    setSitesText(raw);
    setSettings({ guard: { blockedSites: parseList(raw) } });
  };

  const guardModeDesc: Record<GuardMode, string> = {
    nudge: t('settings.guard.nudgeDesc'),
    shield: t('settings.guard.shieldDesc'),
    snap: t('settings.guard.snapDesc'),
    off: t('settings.guard.offDesc'),
  };

  const voiceMissing = access.ttsVoice !== '' && !voices.some((v) => v.voiceURI === access.ttsVoice);

  const previewVoice = () => {
    speak(t('settings.a11y.spoken'), {
      voiceURI: access.ttsVoice || undefined,
      rate: access.speechRate,
    });
  };

  const enableNotifications = async () => {
    await ensureNotificationPermission();
    setPerm(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  };

  const runSync = async () => {
    setBusy(true);
    try {
      const result = await performSync();
      if (result === 'skipped') setNotice('sync skipped — check your settings 🌥️');
      if (result === 'error') setNotice('sync had a wobble 😵');
      if (result === 'ok') setNotice('synced! ✨');
    } finally {
      setBusy(false);
    }
  };

  const onPickImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const value = await fileToDataUrl(file);
      setSettings({ background: { type: 'image', value } });
    } catch {
      setNotice('could not read that image 🥺');
    }
  };

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const parsed = parseImportJson(text);
      if (window.confirm('Import this backup? Your current cutepad data will be replaced.')) {
        importData(parsed);
        setNotice('backup imported 🎉');
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'that file could not be imported 🥺');
    }
  };

  const deleteSubject = (id: string, name: string) => {
    if (window.confirm(`Delete subject “${name}”? blocks and tasks keep their titles but lose the color.`)) {
      removeSubject(id);
    }
  };

  const addNewSubject = () => {
    const name = newSubject.name.trim();
    if (!name) return;
    addSubject(name, newSubject.color, newSubject.icon);
    setNewSubject({ ...newSubject, name: '' });
  };

  const syncPill =
    syncStatus.state === 'synced'
      ? { color: '#8fe3c8', text: `synced ${relative(syncStatus.lastSyncedAt, now)}` }
      : syncStatus.state === 'syncing'
        ? { color: '#ffd76e', text: 'syncing…' }
        : syncStatus.state === 'offline'
          ? { color: '#ffd76e', text: 'offline' }
          : syncStatus.state === 'error'
            ? { color: '#ff6b8f', text: 'sync issue' }
            : { color: '#c8b6ff', text: 'not syncing yet' };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row between wrap">
        <div>
          <div className="page-title" role="heading" aria-level={1}><span aria-hidden="true">⚙️</span> settings</div>
          <div className="page-sub">make cutepad feel like yours <span aria-hidden="true">🎀</span></div>
        </div>
        {notice && (
          <span className="tag" role="status">
            {notice}
            <button type="button" onClick={() => setNotice(null)} title="dismiss" aria-label="dismiss message">
              ✕
            </button>
          </span>
        )}
      </div>

      <div className="settings-grid">
        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">🎨</span> appearance
          </div>
          <div className="theme-grid">
            {THEMES.map((theme) => {
              const active = settings.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-card ${active ? 'active' : ''}`}
                  aria-pressed={active}
                  onClick={() => setSettings({ theme: theme.id, dark: theme.dark ? true : settings.dark })}
                >
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ fontSize: 19 }} aria-hidden="true">
                      {theme.emoji}
                    </span>
                    <strong className="small">{theme.name}</strong>
                    {active && <span className="tag">on</span>}
                  </div>
                  <div className="small muted" style={{ marginTop: 5 }}>
                    {theme.desc}
                  </div>
                  <div className="swatch-row">
                    {theme.swatch.map((color) => (
                      <span key={color} className="swatch" style={{ background: color }} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="divider" />

          <div className="toggle-row">
            <div>
              <strong className="small"><span aria-hidden="true">🌙</span> kawaii night (dark mode)</strong>
              <div className="small muted">sleepy pastels after dark <span aria-hidden="true">💤</span></div>
            </div>
            <Toggle
              checked={settings.dark}
              onChange={(dark) => setSettings({ dark })}
              label="Kawaii night (dark mode)"
            />
          </div>
          <div className="toggle-row">
            <div>
              <strong className="small"><span aria-hidden="true">🍃</span> reduced motion</strong>
              <div className="small muted">calmer, gentler animations for sensitive eyes</div>
            </div>
            <Toggle
              checked={settings.reducedMotion}
              onChange={(reducedMotion) => setSettings({ reducedMotion })}
              label="Reduced motion"
            />
          </div>
        </div>

        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">🖼️</span> background
          </div>
          <Segmented<BackgroundConfig['type']>
            options={[
              { value: 'solid', label: 'solid' },
              { value: 'gradient', label: 'gradient' },
              { value: 'pattern', label: 'pattern' },
              { value: 'image', label: 'image' },
            ]}
            value={bg.type}
            onChange={(type) => setSettings({ background: bgForType(type) })}
          />

          <div style={{ marginTop: 14 }}>
            {bg.type === 'solid' && (
              <div className="bg-grid">
                {SOLID_SWATCHES.map((color) => {
                  const active = bg.color === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      className={`swatch-btn ${active ? 'active' : ''}`}
                      style={{ background: color }}
                      title={`solid ${color}`}
                      aria-label={`solid background ${color}`}
                      aria-pressed={active}
                      onClick={() => setSettings({ background: { type: 'solid', color } })}
                    >
                      {active && (
                        <span className="swatch-check" aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {bg.type === 'gradient' && (
              <div className="bg-grid">
                {GRADIENT_SWATCHES.map((gradient, index) => {
                  const active = bg.value === gradient;
                  return (
                    <button
                      key={gradient}
                      type="button"
                      className={`swatch-btn ${active ? 'active' : ''}`}
                      style={{ backgroundImage: gradient }}
                      title="gradient background"
                      aria-label={`gradient background ${index + 1}`}
                      aria-pressed={active}
                      onClick={() => setSettings({ background: { type: 'gradient', value: gradient } })}
                    >
                      {active && (
                        <span className="swatch-check" aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {bg.type === 'pattern' && (
              <div className="patterns-grid">
                {PATTERNS.map((pattern) => {
                  const active = bg.value === pattern.id;
                  return (
                    <button
                      key={pattern.id}
                      type="button"
                      className={`pattern-tile ${active ? 'active' : ''}`}
                      style={{ backgroundImage: patternCss(pattern.id) }}
                      aria-pressed={active}
                      title={pattern.name}
                      onClick={() => setSettings({ background: { type: 'pattern', value: pattern.id } })}
                    >
                      <span aria-hidden="true">{pattern.emoji}</span>
                      <span className="small">{pattern.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {bg.type === 'image' && (
              <div className="stack" style={{ gap: 10 }}>
                {bg.value ? (
                  <div className="row wrap">
                    <img className="bg-preview" src={bg.value} alt="your background preview" />
                    <button
                      type="button"
                      className="btn btn-sm btn-soft"
                      onClick={() => setSettings({ background: DEFAULT_SETTINGS.background })}
                    >
                      <span aria-hidden="true">🗑</span> remove image
                    </button>
                  </div>
                ) : (
                  <p className="small muted">no image yet — pick one from your device <span aria-hidden="true">🖼️</span></p>
                )}
                <label className="btn btn-soft file-btn">
                  <span aria-hidden="true">📂</span> choose image
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="choose background image"
                    onChange={(e) => void onPickImage(e)}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="divider" />
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setSettings({ background: DEFAULT_SETTINGS.background })}
          >
            <span aria-hidden="true">↺</span> reset background
          </button>
        </div>

        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">🐾</span> mascot & profile
          </div>
          <div className="stack" style={{ gap: 12 }}>
            <div>
              <label className="field-label" htmlFor="mascot-name">
                mascot name
              </label>
              <input
                id="mascot-name"
                className="input"
                value={settings.mascotName}
                placeholder="Mochi"
                onChange={(e) => setSettings({ mascotName: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="buddy-name">
                your name (shown to your buddy)
              </label>
              <input
                id="buddy-name"
                className="input"
                value={settings.studyBuddyName}
                placeholder="e.g. Mina"
                onChange={(e) => setSettings({ studyBuddyName: e.target.value })}
              />
                  <div className="small muted" style={{ marginTop: 6 }}>
                    this is what appears in the buddy comparison <span aria-hidden="true">💕</span>
                  </div>
            </div>
          </div>
        </div>

        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">🍅</span> pomodoro
          </div>
          <div className="form-grid">
            <Stepper
              label="work (min)"
              value={pomo.work}
              min={1}
              max={90}
              onChange={(work) => setSettings({ pomodoro: { ...pomo, work } })}
            />
            <Stepper
              label="short break (min)"
              value={pomo.shortBreak}
              min={1}
              max={90}
              onChange={(shortBreak) => setSettings({ pomodoro: { ...pomo, shortBreak } })}
            />
            <Stepper
              label="long break (min)"
              value={pomo.longBreak}
              min={1}
              max={90}
              onChange={(longBreak) => setSettings({ pomodoro: { ...pomo, longBreak } })}
            />
            <Stepper
              label="long break every"
              value={pomo.longEvery}
              min={1}
              max={8}
              onChange={(longEvery) => setSettings({ pomodoro: { ...pomo, longEvery } })}
            />
          </div>
          <div className="divider" />
          <div className="toggle-row">
            <div>
              <strong className="small">auto-start breaks</strong>
              <div className="small muted">roll straight into rest after focus <span aria-hidden="true">🫧</span></div>
            </div>
            <Toggle
              checked={pomo.autoBreak}
              onChange={(autoBreak) => setSettings({ pomodoro: { ...pomo, autoBreak } })}
              label="Auto-start breaks"
            />
          </div>
          <div className="toggle-row">
            <div>
              <strong className="small">chime when done</strong>
              <div className="small muted">a soft ding instead of a scare <span aria-hidden="true">🔔</span></div>
            </div>
            <Toggle
              checked={pomo.chime}
              onChange={(chime) => setSettings({ pomodoro: { ...pomo, chime } })}
              label="Chime when done"
            />
          </div>
        </div>

        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">🔔</span> notifications
          </div>
          <div className="row wrap" style={{ gap: 10 }}>
            <span className="tag" role="status">
              {perm === 'granted' ? (
                <><span aria-hidden="true">✅</span> granted</>
              ) : perm === 'denied' ? (
                <><span aria-hidden="true">⛔</span> denied</>
              ) : perm === 'default' ? (
                <><span aria-hidden="true">🟡</span> not asked yet</>
              ) : (
                <><span aria-hidden="true">🚫</span> unsupported here</>
              )}
            </span>
            <button type="button" className="btn btn-sm btn-soft" onClick={() => void enableNotifications()}>
              <span aria-hidden="true">🔔</span> enable notifications
            </button>
          </div>
          <div className="divider" />
          <span className="field-label">reminder quick list</span>
          {reminders.length === 0 ? (
            <p className="small muted">no reminders yet — add one in the planner <span aria-hidden="true">🗓️</span></p>
          ) : (
            <div className="stack" style={{ gap: 6 }}>
              {reminders.map((reminder) => (
                <div className="row between wrap" key={reminder.id}>
                  <div style={{ minWidth: 0 }}>
                    <div className="small bold">{reminder.title}</div>
                    <div className="small muted">
                      {reminder.time} ·{' '}
                      {reminder.days.length > 0 ? `days ${reminder.days.join(', ')}` : 'no days set'}
                    </div>
                  </div>
                  <Toggle
                    checked={reminder.enabled}
                    onChange={(enabled) => updateReminder(reminder.id, { enabled })}
                    label={`enable ${reminder.title}`}
                  />
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            style={{ marginTop: 12 }}
            onClick={() => navigate('/planner')}
          >
            <span aria-hidden="true">🗓️</span> manage reminders in planner
          </button>
        </div>

        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">☁️</span> cloud sync
          </div>
          <span className="field-label">provider</span>
          <select
            className="select"
            value={sync.provider}
            aria-label="sync provider"
            onChange={(e) =>
              setSettings({ sync: { ...sync, provider: e.target.value as 'none' | 'supabase' } })
            }
          >
            <option value="none">none (local only)</option>
            <option value="supabase">supabase</option>
          </select>

          {sync.provider === 'supabase' && (
            <div className="stack" style={{ gap: 12, marginTop: 12 }}>
              <div>
                <label className="field-label" htmlFor="sync-url">
                  project rest url
                </label>
                <input
                  id="sync-url"
                  className="input"
                  placeholder="https://xxxx.supabase.co"
                  value={sync.url}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setSettings({ sync: { ...sync, url: e.target.value } })}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="sync-key">
                  anon key
                </label>
                <input
                  id="sync-key"
                  className="input"
                  placeholder="paste your anon key"
                  value={sync.anonKey}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setSettings({ sync: { ...sync, anonKey: e.target.value } })}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="sync-owner">
                  owner (your sync name / email)
                </label>
                <input
                  id="sync-owner"
                  className="input"
                  placeholder="mina@example.com"
                  value={sync.owner}
                  autoComplete="off"
                  onChange={(e) => setSettings({ sync: { ...sync, owner: e.target.value } })}
                />
              </div>
              <label className="consent-row" htmlFor="sync-consent">
                <input
                  id="sync-consent"
                  type="checkbox"
                  checked={!!settings.legal.sync}
                  onChange={(e) =>
                    setSettings({ legal: { ...settings.legal, sync: e.target.checked ? Date.now() : null } })
                  }
                />
                <span>
                  <strong>I consent</strong> to Cutepad sending my notes, settings and study stats to{' '}
                  <em>the Supabase project I configured above</em>, for the purpose of syncing my data between my own
                  devices. I can withdraw this at any time by unchecking this box, which stops all syncing.{' '}
                  <a href="#/privacy">Privacy Policy</a>
                </span>
              </label>
              {!settings.legal.sync && (
                <p className="small muted" style={{ margin: 0 }}>
                  syncing stays off until you give consent above.
                </p>
              )}
              <div className="toggle-row">
                <strong className="small">auto sync every 45s</strong>
                <Toggle
                  checked={sync.autoSync}
                  onChange={(autoSync) => setSettings({ sync: { ...sync, autoSync } })}
                  label="Auto sync"
                />
              </div>
            </div>
          )}

          <div className="divider" />
          <div className="row wrap">
            <span className="pill" role="status">
              <span className="dot" style={{ background: syncPill.color }} />
              {syncPill.text}
            </span>
            <span className="spacer" />
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={busy || (sync.provider === 'supabase' && !settings.legal.sync)}
              title={sync.provider === 'supabase' && !settings.legal.sync ? 'give sync consent first' : undefined}
              onClick={() => void runSync()}
            >
              {busy ? 'syncing…' : <><span aria-hidden="true">⬆️</span> sync now</>}
            </button>
          </div>
          {syncStatus.error && (
            <div className="small" style={{ color: 'var(--danger)', marginTop: 8 }} role="status">
              {syncStatus.error}
            </div>
          )}
          <p className="small muted" style={{ marginTop: 12 }}>
            local-first: everything is saved on this device. configure supabase (see docs/setup-supabase.sql)
            to sync between the website and desktop app.
          </p>
        </div>

        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">💾</span> data & backup
          </div>
          <div className="row wrap">
            <button
              type="button"
              className="btn btn-soft"
              onClick={() => exportAllDataJson(selectData(useApp.getState()))}
            >
              <span aria-hidden="true">⬇️</span> export backup (json)
            </button>
            <label className="btn btn-soft file-btn">
              <span aria-hidden="true">⬆️</span> import backup
              <input
                type="file"
                accept="application/json,.json"
                aria-label="import backup file"
                onChange={(e) => void onImportFile(e)}
              />
            </label>
            <button type="button" className="btn btn-danger" onClick={() => setResetOpen(true)}>
              <span aria-hidden="true">🧹</span> reset everything
            </button>
          </div>
          {isDesktop() && (
            <p className="small muted" style={{ marginTop: 12 }}>
              auto-backups are saved in the app data folder (backups/) every few minutes.
            </p>
          )}
          <p className="small muted" style={{ marginTop: 8 }}>
            backups include notes, planner, tasks, badges and settings <span aria-hidden="true">✨</span>
          </p>
        </div>

        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">📜</span> legal &amp; privacy
          </div>
          <div className="row wrap" style={{ gap: 8 }}>
            <a className="btn btn-soft btn-sm" href="#/privacy">
              <span aria-hidden="true">🔒</span> privacy policy
            </a>
            <a className="btn btn-soft btn-sm" href="#/terms">
              <span aria-hidden="true">📄</span> terms &amp; conditions
            </a>
            <a className="btn btn-soft btn-sm" href="#/cookies">
              <span aria-hidden="true">🍪</span> cookie policy
            </a>
            <a className="btn btn-soft btn-sm" href="#/refunds">
              <span aria-hidden="true">💗</span> refund policy
            </a>
          </div>
          <p className="small muted" style={{ marginTop: 12 }}>
            cutepad runs local-first: no analytics, no trackers, no cookies. consents you have given:{' '}
            {(['sync', 'publish', 'share'] as const)
              .filter((k) => settings.legal[k])
              .map((k) => `${k} ✓`)
              .join(' · ') || 'none yet'}{' '}
            — manage them where each feature is used (sync above, publish in notes, sharing in buddy).
          </p>
        </div>

        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">🌈</span> subjects
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {subjects.map((subject) => (
              <div className="subject-row" key={subject.id}>
                <select
                  className="select"
                  value={subject.icon}
                  aria-label={`emoji for ${subject.name}`}
                  onChange={(e) => updateSubject(subject.id, { icon: e.target.value })}
                >
                  {SUBJECT_EMOJIS.map((emoji) => (
                    <option key={emoji} value={emoji}>
                      {emoji}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  value={subject.name}
                  aria-label={`name of ${subject.name}`}
                  onChange={(e) => updateSubject(subject.id, { name: e.target.value })}
                />
                <div className="swatch-row">
                  {PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`swatch-btn ${subject.color === color ? 'active' : ''}`}
                      style={{ background: color }}
                      title={`set color ${color}`}
                      aria-label={`set color of ${subject.name} to ${color}`}
                      aria-pressed={subject.color === color}
                      onClick={() => updateSubject(subject.id, { color })}
                    >
                      {subject.color === color && (
                        <span className="swatch-check" aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-icon btn-soft"
                  title={`delete ${subject.name}`}
                  aria-label={`delete ${subject.name}`}
                  onClick={() => deleteSubject(subject.id, subject.name)}
                >
                  🗑
                </button>
              </div>
            ))}

            <div className="subject-row">
              <select
                className="select"
                value={newSubject.icon}
                aria-label="new subject emoji"
                onChange={(e) => setNewSubject({ ...newSubject, icon: e.target.value })}
              >
                {SUBJECT_EMOJIS.map((emoji) => (
                  <option key={emoji} value={emoji}>
                    {emoji}
                  </option>
                ))}
              </select>
              <input
                className="input"
                value={newSubject.name}
                placeholder="+ add a subject…"
                aria-label="new subject name"
                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && addNewSubject()}
              />
              <div className="swatch-row">
                {PALETTE.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`swatch-btn ${newSubject.color === color ? 'active' : ''}`}
                    style={{ background: color }}
                    title={`new subject color ${color}`}
                    aria-label={`new subject color ${color}`}
                    aria-pressed={newSubject.color === color}
                    onClick={() => setNewSubject({ ...newSubject, color })}
                  >
                    {newSubject.color === color && (
                      <span className="swatch-check" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={!newSubject.name.trim()}
              onClick={addNewSubject}
            >
              <span aria-hidden="true">＋</span> add
            </button>
            </div>
          </div>
        </div>

        <div className="card pad">
          <div className="card-title">{t('settings.ai.title')}</div>
          <p className="small muted" style={{ marginTop: 0 }}>
            {t('settings.ai.blurb')}
          </p>
          <div className="field" style={{ marginTop: 12 }}>
            <span className="field-label">{t('settings.ai.provider')}</span>
            <Segmented<'local' | 'openai'>
              options={[
                { value: 'local', label: t('settings.ai.local') },
                { value: 'openai', label: t('settings.ai.cloud') },
              ]}
              value={ai.provider}
              onChange={(provider) => setSettings({ ai: { provider } })}
            />
          </div>

          {ai.provider === 'openai' && (
            <div className="stack" style={{ gap: 12, marginTop: 12 }}>
              <div>
                <label className="field-label" htmlFor="ai-base-url">
                  {t('settings.ai.baseUrl')}
                </label>
                <input
                  id="ai-base-url"
                  className="input"
                  placeholder="https://api.openai.com/v1"
                  value={ai.baseUrl}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setSettings({ ai: { baseUrl: e.target.value } })}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="ai-api-key">
                  {t('settings.ai.apiKey')}
                </label>
                <input
                  id="ai-api-key"
                  className="input"
                  type="password"
                  placeholder="sk-…"
                  value={ai.apiKey}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setSettings({ ai: { apiKey: e.target.value } })}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="ai-model">
                  {t('settings.ai.model')}
                </label>
                <input
                  id="ai-model"
                  className="input"
                  placeholder="gpt-4o-mini"
                  value={ai.model}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setSettings({ ai: { model: e.target.value } })}
                />
              </div>
            </div>
          )}

          <span className="tag" style={{ marginTop: 12 }}>
            {ai.provider === 'local' ? t('settings.ai.engineLocal') : t('settings.ai.engineCloud')}
          </span>
        </div>

        <div className="card pad">
          <div className="card-title">{t('settings.guard.title')}</div>
          <p className="small muted" style={{ marginTop: 0 }}>
            {t('settings.guard.blurb')}
          </p>
          <div className="toggle-row">
            <div>
              <strong className="small">{t('settings.guard.enabled')}</strong>
              <div className="small muted">{guardModeDesc[guard.mode]}</div>
            </div>
            <Toggle
              checked={guard.enabled}
              onChange={(enabled) => setSettings({ guard: { enabled } })}
              label={t('settings.guard.enabled')}
            />
          </div>
          <div className="field">
            <span className="field-label">{t('settings.guard.mode')}</span>
            <Segmented<GuardMode>
              options={GUARD_MODES.map((mode) => ({ value: mode, label: t(`settings.guard.${mode}`) }))}
              value={guard.mode}
              onChange={(mode) => setSettings({ guard: { mode } })}
            />
          </div>

          <div className="divider" />

          <div className="stack" style={{ gap: 14 }}>
            <div className="field">
              <label className="field-label" htmlFor="guard-apps">
                {t('settings.guard.apps')}
              </label>
              <input
                id="guard-apps"
                className="input"
                value={appsText}
                placeholder="discord, steam, tiktok"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setGuardApps(e.target.value)}
              />
              <div className="small muted">{t('settings.guard.appsHint')}</div>
              <div className="row wrap" style={{ gap: 6 }}>
                {guard.blockedApps.length === 0 ? (
                  <span className="small muted">{t('settings.guard.emptyList')}</span>
                ) : (
                  guard.blockedApps.map((app) => (
                    <span className="chip" key={app} style={{ cursor: 'default' }}>
                      {app}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="guard-sites">
                {t('settings.guard.sites')}
              </label>
              <input
                id="guard-sites"
                className="input"
                value={sitesText}
                placeholder="youtube.com, reddit.com"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setGuardSites(e.target.value)}
              />
              <div className="small muted">{t('settings.guard.sitesHint')}</div>
              <div className="row wrap" style={{ gap: 6 }}>
                {guard.blockedSites.length === 0 ? (
                  <span className="small muted">{t('settings.guard.emptyList')}</span>
                ) : (
                  guard.blockedSites.map((site) => (
                    <span className="chip" key={site} style={{ cursor: 'default' }}>
                      {site}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <p className="small muted" style={{ marginTop: 12 }}>
            {t('settings.guard.platformNote')}
          </p>
        </div>

        <div className="card pad">
          <div className="card-title">{t('settings.a11y.title')}</div>
          <div className="toggle-row">
            <div>
              <strong className="small">{t('settings.a11y.dyslexia')}</strong>
              <div className="small muted">{t('settings.a11y.dyslexiaHint')}</div>
            </div>
            <Toggle
              checked={access.dyslexiaFont}
              onChange={(dyslexiaFont) => setSettings({ accessibility: { dyslexiaFont } })}
              label={t('settings.a11y.dyslexia')}
            />
          </div>
          <p className="dyslexia" style={{ ...DYSLEXIA_SAMPLE_STYLE, marginTop: 0, marginBottom: 0 }}>
            {t('settings.a11y.sample')}
          </p>

          <div className="divider" />

          <div className="toggle-row">
            <div>
              <strong className="small">{t('settings.a11y.tts')}</strong>
              <div className="small muted">{t('settings.a11y.ttsHint')}</div>
            </div>
            <Toggle
              checked={access.ttsEnabled}
              onChange={(ttsEnabled) => setSettings({ accessibility: { ttsEnabled } })}
              label={t('settings.a11y.tts')}
            />
          </div>

          <div className="stack" style={{ gap: 12 }}>
            <div className="field">
              <label className="field-label" htmlFor="a11y-voice">
                {t('settings.a11y.voice')}
              </label>
              <select
                id="a11y-voice"
                className="select"
                value={access.ttsVoice}
                disabled={!ttsReady}
                onChange={(e) => setSettings({ accessibility: { ttsVoice: e.target.value } })}
              >
                <option value="">{t('settings.a11y.voiceDefault')}</option>
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {`${voice.name} (${voice.lang})`}
                  </option>
                ))}
                {voiceMissing && <option value={access.ttsVoice}>{access.ttsVoice}</option>}
              </select>
            </div>

            <div className="field">
              <span className="field-label">{t('settings.a11y.rate')}</span>
              <div className="row" style={{ gap: 10 }}>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={access.speechRate}
                  aria-label={t('settings.a11y.rate')}
                  aria-valuetext={`×${access.speechRate.toFixed(1)}`}
                  style={{ flex: 1, minWidth: 0, accentColor: 'var(--accent)' }}
                  onChange={(e) => setSettings({ accessibility: { speechRate: Number(e.target.value) } })}
                />
                <span className="small bold" style={{ minWidth: 44, textAlign: 'right' }}>
                  {`×${access.speechRate.toFixed(1)}`}
                </span>
              </div>
            </div>

            <div className="row wrap" style={{ gap: 10 }}>
              <button
                type="button"
                className="btn btn-sm btn-soft"
                disabled={!ttsReady}
                onClick={previewVoice}
              >
                {t('settings.a11y.preview')}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={!ttsReady}
                onClick={() => stopSpeaking()}
              >
                {t('settings.a11y.stop')}
              </button>
              {!ttsReady && <span className="small muted">{t('settings.a11y.unavailable')}</span>}
            </div>
          </div>
        </div>

        <div className="card pad">
          <div className="card-title">{t('settings.lang.title')}</div>
          <Segmented<Locale>
            options={LOCALES.map((locale) => ({ value: locale, label: t(`settings.lang.${locale}`) }))}
            value={settings.locale}
            onChange={(locale) => setSettings({ locale })}
          />
          <p className="small muted" style={{ marginTop: 10 }}>
            {t('settings.lang.note')}
          </p>
        </div>

        <div className="card pad">
          <div className="card-title">
            <span aria-hidden="true">♡</span> about
          </div>
          <div className="row" style={{ gap: 12 }}>
            <span style={{ fontSize: 30 }} aria-hidden="true">
              🌸
            </span>
            <div>
              <div className="stat-value">Cutepad</div>
              <div className="small muted">version 0.1.0 · kawaii notepad & study companion</div>
            </div>
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>
            {settings.mascotName || 'Mochi'} the study buddy was drawn with <span aria-hidden="true">💗</span> — thanks
            for studying with us!
          </p>
          <div className="row wrap" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="btn btn-sm btn-soft"
              onClick={() => navigate('/achievements')}
            >
              <span aria-hidden="true">🏆</span> badges
            </button>
            <button type="button" className="btn btn-sm btn-soft" onClick={() => navigate('/buddy')}>
              <span aria-hidden="true">👫</span> buddy
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={resetOpen}
        title="reset everything? 🧹"
        onClose={() => setResetOpen(false)}
        actions={
          <>
            <button type="button" className="btn btn-soft" onClick={() => setResetOpen(false)}>
              keep my stuff
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                resetAll();
                setResetOpen(false);
                setNotice('fresh start 🌱');
              }}
            >
              yes, start over
            </button>
          </>
        }
      >
        <p style={{ fontWeight: 700 }}>
          this wipes every note, task, planner block, badge, subject and setting on this device and restores the
          cozy defaults.
        </p>
        <p className="small muted">export a backup first if you might want it back later <span aria-hidden="true">💗</span></p>
      </Modal>
    </div>
  );
}
