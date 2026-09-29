import {
  ACHIEVEMENTS,
  dayKey,
  getBridge,
  moodStreak,
  streaks,
  todayKey,
  useApp,
} from '@cutepad/core';

export interface FocusPresence {
  details: string;
  state: string;
  startMs: number;
}

export interface NotePresence {
  id: string;
  title: string;
}

export interface DocPresence {
  id: string;
  name: string;
}

export interface StudyPresence {
  id: string;
  name: string;
  cards: number;
}

type Store = ReturnType<typeof useApp.getState>;

const MAX_NAME = 30;
const TAGLINE = 'kawaii notepad & study companion';

let focus: FocusPresence | null = null;
let note: NotePresence | null = null;
let doc: DocPresence | null = null;
let study: StudyPresence | null = null;
let routePath = '';

let identity = '';
let startedAt = 0;
let lastSentKey = '';

function truncName(text: string): string {
  const value = text.trim();
  if (value.length <= MAX_NAME) return value;
  return `${value.slice(0, MAX_NAME - 1)}…`;
}

function notesToday(s: Store): string {
  const today = todayKey();
  const count = s.notes.filter((n) => dayKey(n.createdAt) === today).length;
  if (count > 0) return `${count} ${count === 1 ? 'note' : 'notes'} today`;
  const total = s.notes.length;
  return `${total} ${total === 1 ? 'note' : 'notes'} total`;
}

interface RouteActivity {
  details: string;
  state?: (s: Store) => string;
}

const ROUTES: Record<string, RouteActivity> = {
  '/': { details: 'Browsing notes', state: () => 'On the dashboard' },
  '/notes': { details: 'Taking notes', state: notesToday },
  '/planner': {
    details: 'Planning the week',
    state: (s) => {
      const count = s.blocks.filter((b) => b.date === todayKey()).length;
      return count > 0 ? `${count} ${count === 1 ? 'block' : 'blocks'} today` : 'No blocks today';
    },
  },
  '/focus': {
    details: 'Ready to focus',
    state: (s) => `${s.settings.pomodoro.work}/${s.settings.pomodoro.shortBreak} pomodoro`,
  },
  '/tasks': {
    details: 'Checking tasks',
    state: (s) => {
      const open = s.tasks.filter((t) => !t.done).length;
      return open > 0 ? `${open} tasks left` : 'All tasks done';
    },
  },
  '/flashcards': {
    details: 'Reviewing flashcards',
    state: (s) =>
      `${s.decks.length} ${s.decks.length === 1 ? 'deck' : 'decks'} · ${s.flashcards.length} cards`,
  },
  '/mood': {
    details: 'Logging my mood',
    state: (s) => {
      const streak = moodStreak(s.moods);
      return streak > 0 ? `${streak} day mood streak` : 'Mood check-in';
    },
  },
  '/documents': { details: 'Browsing documents', state: (s) => `${s.docs.length} documents` },
  '/smart': { details: 'Using Smart tools' },
  '/analytics': {
    details: 'Reviewing stats',
    state: (s) => {
      const { current } = streaks(s.sessions, s.tasks);
      return current > 0 ? `${current} day streak` : 'Fresh start';
    },
  },
  '/achievements': {
    details: 'Collecting badges',
    state: (s) => {
      const unlocked = new Set(s.achievements.map((a) => a.id));
      const count = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length;
      return `${count}/${ACHIEVEMENTS.length} badges`;
    },
  },
  '/buddy': { details: 'With the study buddy' },
  '/account': {
    details: 'Viewing my profile',
    state: (s) => (s.auth.isLoggedIn ? s.auth.user?.name || 'Signed in' : 'Local mode'),
  },
  '/settings': { details: 'Customizing Cutepad' },
};

function currentIdentity(): string {
  if (focus) return 'focus';
  if (note) return `note:${note.id}`;
  if (doc) return `doc:${doc.id}`;
  if (study) return `study:${study.id}`;
  if (routePath) return `route:${routePath}`;
  return 'idle';
}

function desired(): { details: string; state?: string; startMs: number } {
  const s = useApp.getState();
  if (focus) return { details: focus.details, state: focus.state, startMs: focus.startMs };
  if (note) {
    const title = truncName(note.title);
    return {
      details: title ? `Editing "${title}"` : 'Creating a note',
      state: notesToday(s),
      startMs: startedAt,
    };
  }
  if (doc) {
    return {
      details: `Reading "${truncName(doc.name)}"`,
      state: `${s.docs.length} documents`,
      startMs: startedAt,
    };
  }
  if (study) {
    return {
      details: 'Studying',
      state: `${truncName(study.name)} · ${study.cards} cards`,
      startMs: startedAt,
    };
  }
  const route = ROUTES[routePath] ?? { details: 'Using Cutepad', state: () => TAGLINE };
  return { details: route.details, state: route.state?.(s), startMs: startedAt };
}

function send(): void {
  const bridge = getBridge();
  if (!bridge) return;
  const next = currentIdentity();
  if (next !== identity) {
    identity = next;
    startedAt = Date.now();
  }
  const payload = desired();
  const key = JSON.stringify(payload);
  if (key === lastSentKey) return;
  lastSentKey = key;
  bridge.setPresence(payload);
}

export function setRoutePresence(path: string): void {
  if (path === routePath) return;
  routePath = path;
  send();
}

export function setNotePresence(next: NotePresence | null): void {
  note = next;
  send();
}

export function setDocPresence(next: DocPresence | null): void {
  doc = next;
  send();
}

export function setStudyPresence(next: StudyPresence | null): void {
  study = next;
  send();
}

export function setFocusPresence(next: FocusPresence | null): void {
  focus = next;
  send();
}

// context counts (notes today, tasks left, streaks) stay fresh as data changes;
// payload-key dedupe inside send() keeps IPC chatter to real changes only
useApp.subscribe(() => send());
