import type {
  CutepadData,
  Folder,
  Note,
  Settings,
  Sticky,
  Subject,
  TimeBlock,
} from './types';

export const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export const PALETTE = [
  '#ffd1e3',
  '#e3d1ff',
  '#cdeee4',
  '#cfe5ff',
  '#ffe9c7',
  '#ffd8c2',
  '#f6c9e8',
  '#d0f0c0',
];

export const NOTE_COLORS = ['#fff7fb', '#fdf7ff', '#f6fffb', '#f5faff', '#fffdf2', '#fff4ee'];

export const STICKY_COLORS = ['#fff3a8', '#ffd6e8', '#d9f7e6', '#d6e6ff', '#ecd9ff', '#ffe0cc'];

export const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'sub-math', name: 'Math', color: '#ffd1e3', icon: '🧮' },
  { id: 'sub-science', name: 'Science', color: '#cdeee4', icon: '🔬' },
  { id: 'sub-english', name: 'English', color: '#e3d1ff', icon: '📖' },
  { id: 'sub-art', name: 'Art', color: '#ffe9c7', icon: '🎨' },
  { id: 'sub-lang', name: 'Languages', color: '#cfe5ff', icon: '💬' },
];

export const DEFAULT_FOLDERS: Folder[] = [
  { id: 'fld-notes', name: 'My Notes', icon: '📔', color: '#ffd1e3', createdAt: Date.now() },
  { id: 'fld-study', name: 'Study Notes', icon: '📚', color: '#e3d1ff', createdAt: Date.now() },
  { id: 'fld-ideas', name: 'Ideas', icon: '💡', color: '#ffe9c7', createdAt: Date.now() },
];

export const DEFAULT_SETTINGS: Settings = {
  theme: 'pastel-dream',
  dark: false,
  background: { type: 'gradient', value: 'linear-gradient(160deg, #ffe9f3 0%, #f0e6ff 45%, #e3f4ff 100%)' },
  mascotName: 'Mochi',
  studyBuddyName: '',
  pomodoro: { work: 25, shortBreak: 5, longBreak: 15, longEvery: 4, autoBreak: false, chime: true },
  ambient: { track: null, volume: 0.5 },
  sync: { provider: 'none', url: '', anonKey: '', owner: '', autoSync: true },
  reducedMotion: false,
  mascotOutfit: 'none',
  locale: 'en',
  ai: { provider: 'local', baseUrl: '', apiKey: '', model: 'gpt-4o-mini' },
  guard: {
    enabled: false,
    mode: 'nudge',
    blockedApps: ['discord', 'steam', 'spotify', 'epicgames', 'battle.net'],
    blockedSites: ['youtube.com', 'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'tiktok.com', 'reddit.com'],
  },
  accessibility: { dyslexiaFont: false, ttsEnabled: true, ttsVoice: '', speechRate: 1 },
  legal: { sync: null, publish: null, share: null },
};

const WELCOME_HTML = `
<p>hiii! i'm <b>Mochi</b> 🌸 your study buddy~</p>
<p>here are a few cute things you can do:</p>
<ul>
  <li>✏️ write notes &amp; stick <mark style="background:#fff3a8">highlights</mark> on them</li>
  <li>🗓️ drag study blocks around your planner</li>
  <li>🍅 start a pomodoro focus session</li>
  <li>🌈 doodle in drawing mode with sparkly pens</li>
  <li>🏆 unlock badges &amp; grow your study plant</li>
</ul>
<p>everything saves automatically. have a cozy day! 💗</p>
`.trim();

export function seedNote(now: number): Note {
  return {
    id: 'note-welcome',
    folderId: 'fld-notes',
    title: 'Welcome to Cutepad 🌸',
    html: WELCOME_HTML,
    text: "hiii! i'm Mochi 🌸 your study buddy~ here are a few cute things you can do: write notes & highlights on them, drag study blocks around your planner, start a pomodoro focus session, doodle in drawing mode with sparkly pens, unlock badges & grow your study plant. everything saves automatically. have a cozy day! 💗",
    tags: ['welcome'],
    drawing: null,
    color: '#fff7fb',
    pinned: true,
    share: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function seedBlocks(now: number): TimeBlock[] {
  const d = new Date(now);
  const iso = (offset: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + offset);
    return dayKey(x);
  };
  return [
    { id: uid(), title: 'Calculus practice', subjectId: 'sub-math', date: iso(0), startMin: 16 * 60, durationMin: 60, color: '#ffd1e3' },
    { id: uid(), title: 'Read chapter 4', subjectId: 'sub-english', date: iso(1), startMin: 18 * 60, durationMin: 45, color: '#e3d1ff' },
    { id: uid(), title: 'Chemistry lab prep', subjectId: 'sub-science', date: iso(2), startMin: 15 * 60 + 30, durationMin: 90, color: '#cdeee4' },
  ];
}

export function defaultStickies(): Sticky[] {
  return [
    {
      id: 'sticky-hello',
      text: 'remember to drink water! 💧',
      color: '#fff3a8',
      x: window.innerWidth - 320,
      y: 90,
      w: 230,
      h: 170,
      z: 10,
      updatedAt: Date.now(),
    },
  ];
}

export function createInitialData(): CutepadData {
  const now = Date.now();
  const freshSrs = () => ({ state: 'new' as const, ease: 2.5, interval: 0, due: now, reps: 0, lapses: 0, step: 0, lastReviewedAt: null });
  return {
    version: 1,
    subjects: DEFAULT_SUBJECTS.map((s) => ({ ...s })),
    folders: DEFAULT_FOLDERS.map((f) => ({ ...f })),
    notes: [seedNote(now)],
    blocks: seedBlocks(now),
    tasks: [
      { id: uid(), title: 'Finish math worksheet', subjectId: 'sub-math', priority: 'high', due: dayKey(new Date(now + 864e5)), done: false, createdAt: now, completedAt: null },
      { id: uid(), title: 'Review flashcards', subjectId: 'sub-lang', priority: 'medium', due: null, done: false, createdAt: now, completedAt: null },
      { id: uid(), title: 'Tidy the study desk', subjectId: null, priority: 'low', due: null, done: true, createdAt: now, completedAt: now },
    ],
    sessions: [],
    stickies: typeof window === 'undefined' ? [] : defaultStickies(),
    reminders: [
      { id: uid(), title: 'Morning study session 🌤️', time: '08:00', days: [1, 2, 3, 4, 5], subjectId: null, enabled: false, lastFired: null },
    ],
    achievements: [],
    decks: [{ id: 'deck-demo', name: 'Demo Deck', icon: '🎴', color: '#e3d1ff', description: 'Try reviewing these!', createdAt: now, updatedAt: now }],
    flashcards: [
      { id: uid(), deckId: 'deck-demo', front: 'What does cramming mean?', back: 'Studying a lot in a short time — better little by little!', template: 'basic', tags: [], sourceNoteId: null, srs: freshSrs(), createdAt: now, updatedAt: now },
      { id: uid(), deckId: 'deck-demo', front: 'The capital of France is [[Paris]]', back: 'Paris', template: 'cloze', tags: [], sourceNoteId: null, srs: freshSrs(), createdAt: now, updatedAt: now },
      { id: uid(), deckId: 'deck-demo', front: 'Mitochondria', back: 'The powerhouse of the cell — makes energy (ATP).', template: 'basic', tags: [], sourceNoteId: null, srs: freshSrs(), createdAt: now, updatedAt: now },
    ],
    reviewLogs: [],
    moods: [],
    docs: [],
    unlockedStickers: [],
    unlockedOutfits: [],
    settings: { ...DEFAULT_SETTINGS },
    buddy: { pairCode: null, partnerName: null, groupCode: null },
    updatedAt: now,
  };
}

const LOCALE_VALUES = ['en', 'es', 'ja'];

export function normalizeSettings(raw: unknown): Settings {
  const s = (raw ?? {}) as Partial<Settings>;
  const d = DEFAULT_SETTINGS;
  const locale = LOCALE_VALUES.includes(s.locale as string) ? (s.locale as Settings['locale']) : d.locale;
  return {
    ...d,
    ...s,
    locale,
    pomodoro: { ...d.pomodoro, ...(s.pomodoro ?? {}) },
    ambient: { ...d.ambient, ...(s.ambient ?? {}) },
    sync: { ...d.sync, ...(s.sync ?? {}) },
    ai: { ...d.ai, ...(s.ai ?? {}) },
    guard: { ...d.guard, ...(s.guard ?? {}) },
    accessibility: { ...d.accessibility, ...(s.accessibility ?? {}) },
    legal: {
      sync: typeof s.legal?.sync === 'number' ? s.legal.sync : null,
      publish: typeof s.legal?.publish === 'number' ? s.legal.publish : null,
      share: typeof s.legal?.share === 'number' ? s.legal.share : null,
    },
  };
}

export function normalizeData(partial: Partial<CutepadData> | null | undefined, fallback?: CutepadData): CutepadData {
  const base = fallback ?? createInitialData();
  const p = partial ?? {};
  return {
    ...base,
    ...p,
    subjects: p.subjects ?? base.subjects,
    folders: p.folders ?? base.folders,
    blocks: p.blocks ?? base.blocks,
    tasks: p.tasks ?? base.tasks,
    sessions: p.sessions ?? base.sessions,
    stickies: p.stickies ?? base.stickies,
    reminders: p.reminders ?? base.reminders,
    achievements: p.achievements ?? base.achievements,
    decks: p.decks ?? [],
    flashcards: p.flashcards ?? [],
    reviewLogs: p.reviewLogs ?? [],
    moods: p.moods ?? [],
    docs: p.docs ?? [],
    unlockedStickers: p.unlockedStickers ?? [],
    unlockedOutfits: p.unlockedOutfits ?? [],
    settings: normalizeSettings(p.settings ?? base.settings),
    notes: (p.notes ?? base.notes).map((n) => ({ ...n, share: n.share ?? null })),
    buddy: { ...base.buddy, ...(p.buddy ?? {}), groupCode: p.buddy?.groupCode ?? base.buddy.groupCode ?? null },
    updatedAt: p.updatedAt ?? Date.now(),
  };
}

export function dayKey(input: Date | string | number = new Date()): string {
  const d = input instanceof Date ? input : new Date(input);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dayKey(new Date());
}
