import { useEffect, type CSSProperties, type ReactElement } from 'react';
import { deriveStats, isDesktop, useApp, type BackgroundConfig } from '@cutepad/core';
import { AmbientPopover, CelebrationLayer, Mascot, PlantCompanion, patternCss } from '@cutepad/ui';
import Titlebar from './components/Titlebar';
import StickyLayer from './components/StickyLayer';
import StickyPage from './pages/StickyPage';
import SharePage from './pages/SharePage';
import { PrivacyPage, TermsPage, CookiesPage, RefundsPage } from './pages/LegalPages';
import DashboardView from './views/DashboardView';
import NotesView from './views/NotesView';
import PlannerView from './views/PlannerView';
import FocusView from './views/FocusView';
import TasksView from './views/TasksView';
import FlashcardsView from './views/FlashcardsView';
import MoodView from './views/MoodView';
import DocumentsView from './views/DocumentsView';
import SmartView from './views/SmartView';
import AnalyticsView from './views/AnalyticsView';
import AchievementsView from './views/AchievementsView';
import BuddyView from './views/BuddyView';
import SettingsView from './views/SettingsView';
import { mascotLine, useAmbient, useDesktopBackup, useFocusGuard, useHashRoute, useMascotMood, useReminderTicker } from './hooks';
import { useT } from './i18n';

interface NavItem {
  path: string;
  labelKey: string;
  fallback: string;
  emoji: string;
  comp: () => ReactElement;
}

const NAV: NavItem[] = [
  { path: '/', labelKey: 'nav.home', fallback: 'Home', emoji: '🏠', comp: DashboardView },
  { path: '/notes', labelKey: 'nav.notes', fallback: 'Notes', emoji: '📝', comp: NotesView },
  { path: '/planner', labelKey: 'nav.planner', fallback: 'Planner', emoji: '🗓️', comp: PlannerView },
  { path: '/focus', labelKey: 'nav.focus', fallback: 'Focus', emoji: '🍅', comp: FocusView },
  { path: '/tasks', labelKey: 'nav.tasks', fallback: 'Tasks', emoji: '✅', comp: TasksView },
  { path: '/flashcards', labelKey: 'nav.flashcards', fallback: 'Flashcards', emoji: '🃏', comp: FlashcardsView },
  { path: '/mood', labelKey: 'nav.mood', fallback: 'Mood', emoji: '😊', comp: MoodView },
  { path: '/documents', labelKey: 'nav.documents', fallback: 'Documents', emoji: '📎', comp: DocumentsView },
  { path: '/smart', labelKey: 'nav.smart', fallback: 'Smart', emoji: '✨', comp: SmartView },
  { path: '/analytics', labelKey: 'nav.analytics', fallback: 'Stats', emoji: '📊', comp: AnalyticsView },
  { path: '/achievements', labelKey: 'nav.achievements', fallback: 'Badges', emoji: '🏆', comp: AchievementsView },
  { path: '/buddy', labelKey: 'nav.buddy', fallback: 'Buddy', emoji: '👫', comp: BuddyView },
  { path: '/settings', labelKey: 'nav.settings', fallback: 'Settings', emoji: '⚙️', comp: SettingsView },
];

function backgroundStyle(bg: BackgroundConfig, dark: boolean): CSSProperties {
  switch (bg.type) {
    case 'solid':
      return { background: bg.color };
    case 'gradient':
      return { backgroundImage: bg.value, ...(dark ? { filter: 'brightness(0.5) saturate(1.05)' } : {}) };
    case 'pattern':
      return { backgroundImage: patternCss(bg.value), ...(dark ? { filter: 'brightness(0.55)' } : {}) };
    case 'image':
      return bg.value
        ? { backgroundImage: `url(${bg.value})`, ...(dark ? { filter: 'brightness(0.5)' } : {}) }
        : backgroundStyle({ type: 'gradient', value: 'linear-gradient(160deg, #ffe9f3 0%, #f0e6ff 45%, #e3f4ff 100%)' }, dark);
    default:
      return {};
  }
}

function greeting(name: string): string {
  const h = new Date().getHours();
  const part = h < 5 ? 'night owl hours' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  return name ? `cozy ${part}, ${name}` : `cozy ${part}`;
}

export default function App() {
  const [route, navigate] = useHashRoute();
  const settings = useApp((s) => s.settings);
  const sessions = useApp((s) => s.sessions);
  const tasks = useApp((s) => s.tasks);
  const notes = useApp((s) => s.notes);
  const syncState = useApp((s) => s.sync.state);
  const addSticky = useApp((s) => s.addSticky);
  const pushEvent = useApp((s) => s.pushEvent);
  const mascotMood = useMascotMood();
  const guard = useFocusGuard();
  const t = useT();

  useReminderTicker();
  useDesktopBackup();
  useAmbient();

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.body.style.background = settings.dark ? '#171227' : '#f7f2ff';
    document.title = 'Cutepad · kawaii notepad & study buddy';
  }, [settings.theme, settings.dark]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'cutepad-state' && e.newValue) {
        void useApp.persist.rehydrate();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // desktop app: lock scrolling on the home page only (content fits; extra page padding caused a phantom scroll)
  useEffect(() => {
    const lock = route.split('?')[0] === '/' && isDesktop();
    document.documentElement.style.overflow = lock ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [route]);

  useEffect(() => {
    let last = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - last > 30000) {
        last = now;
        useApp.getState().touch();
      }
    };
    window.addEventListener('pointerdown', onActivity);
    window.addEventListener('keydown', onActivity);
    return () => {
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
    };
  }, []);

  const stats = deriveStats({ sessions, tasks, notesCount: notes.length });
  const stickyMatch = route.match(/^\/sticky\/(.+)$/);
  const appClass = [
    'app',
    settings.dark ? 'dark' : '',
    settings.reducedMotion ? 'reduce-motion' : '',
    settings.accessibility.dyslexiaFont ? 'dyslexia' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const bg = backgroundStyle(settings.background, settings.dark);

  if (stickyMatch) {
    return (
      <div className={appClass}>
        <div className="bg-layer" style={bg} />
        <StickyPage id={stickyMatch[1]} />
        <CelebrationLayer />
      </div>
    );
  }

  if (route.startsWith('/share/')) {
    return (
      <div className={appClass}>
        <div className="bg-layer" style={bg} />
        <SharePage route={route} />
      </div>
    );
  }

  const routePath = route.split('?')[0];

  const LEGAL: Record<string, () => ReactElement> = {
    '/privacy': PrivacyPage,
    '/terms': TermsPage,
    '/cookies': CookiesPage,
    '/refunds': RefundsPage,
  };
  const LegalView = LEGAL[routePath];
  if (LegalView) {
    return (
      <div className={appClass}>
        <div className="bg-layer" style={bg} />
        <LegalView />
      </div>
    );
  }

  const active = NAV.find((n) => n.path === routePath) ?? NAV[0];
  const ActiveView = active.comp;

  return (
    <div className={appClass}>
      <div className="bg-layer" style={bg} />
      {isDesktop() && <Titlebar />}

      {guard.enabled && guard.banner && guard.hit && (
        <div className="guard-banner" role="alert">
          🛡️ “{guard.hit.app}” is on your block list — back to focus!{' '}
          <button className="btn btn-sm btn-soft" onClick={guard.dismiss}>
            ok 💗
          </button>
        </div>
      )}
      {guard.enabled && guard.shield && guard.hit && (
        <div className="guard-shield" role="alertdialog" aria-label="Focus guard">
          <div style={{ fontSize: 54 }}>🛡️</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, margin: 0 }}>Stay on track!</h2>
          <p style={{ opacity: 0.85, margin: 0 }}>
            you were just in <b>{guard.hit.app}</b>. your future self says thanks 💗
          </p>
          <button className="btn btn-primary" onClick={guard.dismiss}>
            I’m back 💪
          </button>
        </div>
      )}

      <div className="app-shell">
        <button
          type="button"
          className="btn btn-primary btn-sm skip-link"
          onClick={() => document.getElementById('main-content')?.focus()}
        >
          skip to content
        </button>
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-dot" aria-hidden="true">
              🌸
            </span>
            Cutepad
          </div>
          <nav className="nav" aria-label="Main navigation">
            {NAV.map((item) => (
              <button
                key={item.path}
                className={`nav-item ${routePath === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
                aria-current={routePath === item.path ? 'page' : undefined}
              >
                <span className="nav-emoji" aria-hidden="true">
                  {item.emoji}
                </span>
                {t(item.labelKey)}
              </button>
            ))}
          </nav>
          <div className="sidebar-foot">
            <div className="card pad" style={{ padding: 12 }}>
              <div className="row between" style={{ gap: 6 }}>
                <div>
                  <div className="stat-value" style={{ fontSize: 18 }}>
                    🔥 {stats.streak}d
                  </div>
                  <div className="stat-label">{t('side.studyStreak')}</div>
                </div>
                <PlantCompanion stage={Math.min(5, Math.floor(stats.totalMinutes / 120))} pct={50} size={64} />
              </div>
            </div>
            <button className="btn btn-soft btn-block btn-sm" onClick={() => addSticky()}>
              {t('side.newSticky')}
            </button>
            <div className="pill small" style={{ paddingLeft: 4 }}>
              <span
                className="dot"
                style={{ background: syncState === 'error' ? '#ff6b8f' : syncState === 'synced' ? '#8fe3c8' : '#ffd76e' }}
              />
              {syncState === 'synced'
                ? t('side.synced')
                : syncState === 'syncing'
                  ? t('side.syncing')
                  : syncState === 'error'
                    ? t('side.syncIssue')
                    : t('side.local')}
            </div>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <span style={{ fontSize: 18 }}>{active.emoji}</span>
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: 17 }}>{greeting(settings.studyBuddyName)}</strong>
            <span className="spacer" />
            <span className="tag hide-mobile">{t('top.streak', { n: stats.streak })}</span>
            <span className="tag hide-mobile">{t('top.today', { n: stats.minutesToday })}</span>
            <AmbientPopover />
            <button
              className="btn btn-icon btn-soft"
              title={mascotLine(mascotMood)}
              aria-label={`Mascot message: ${mascotLine(mascotMood)}`}
              onClick={() => pushEvent('encourage', mascotLine('love'))}
              style={{ padding: 0, overflow: 'hidden' }}
            >
              <Mascot mood={mascotMood} size={34} />
            </button>
          </header>

          <main className="page" id="main-content" tabIndex={-1}>
            <ActiveView />
          </main>
        </div>
      </div>

      <nav className="mobile-nav" aria-label="Main navigation">
        {NAV.map((item) => (
          <button
            key={item.path}
            className={routePath === item.path ? 'active' : ''}
            onClick={() => navigate(item.path)}
            aria-current={routePath === item.path ? 'page' : undefined}
          >
            <span aria-hidden="true">{item.emoji}</span>
            {t(item.labelKey)}
          </button>
        ))}
      </nav>

      <StickyLayer />
      <CelebrationLayer />
    </div>
  );
}
