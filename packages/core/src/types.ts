export type ID = string;

export interface Subject {
  id: ID;
  name: string;
  color: string;
  icon: string;
}

export interface Folder {
  id: ID;
  name: string;
  icon: string;
  color: string;
  createdAt: number;
}

export interface Note {
  id: ID;
  folderId: ID | null;
  title: string;
  html: string;
  text: string;
  tags: string[];
  drawing: string | null;
  color: string;
  pinned: boolean;
  share: NoteShare | null;
  createdAt: number;
  updatedAt: number;
}

export interface TimeBlock {
  id: ID;
  title: string;
  subjectId: ID | null;
  date: string;
  startMin: number;
  durationMin: number;
  color: string;
}

export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: ID;
  title: string;
  subjectId: ID | null;
  priority: Priority;
  due: string | null;
  dueAlarmed?: boolean;
  done: boolean;
  createdAt: number;
  completedAt: number | null;
}

export type SessionKind = 'focus' | 'break' | 'custom';

export interface SessionLog {
  id: ID;
  subjectId: ID | null;
  kind: SessionKind;
  minutes: number;
  startedAt: number;
  endedAt: number;
}

export interface Sticky {
  id: ID;
  text: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  updatedAt: number;
}

export interface Reminder {
  id: ID;
  title: string;
  time: string;
  days: number[];
  subjectId: ID | null;
  enabled: boolean;
  lastFired: string | null;
}

export interface AchievementUnlock {
  id: ID;
  at: number;
}

export type ThemeId =
  | 'pastel-dream'
  | 'hello-berry'
  | 'pastel-goth'
  | 'cottagecore'
  | 'space-kawaii'
  | 'kawaii-night';

export type BackgroundConfig =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; value: string }
  | { type: 'pattern'; value: string }
  | { type: 'image'; value: string };

export interface PomodoroSettings {
  work: number;
  shortBreak: number;
  longBreak: number;
  longEvery: number;
  autoBreak: boolean;
  chime: boolean;
}

export interface SyncSettings {
  provider: 'none' | 'supabase' | 'firebase';
  url: string;
  anonKey: string;
  owner: string;
  autoSync: boolean;
}

export interface AuthState {
  isLoggedIn: boolean;
  user: { email: string; name: string } | null;
}

export interface OnboardingState {
  hasCompletedOnboarding: boolean;
  step: number;
}

export interface LegalConsents {
  /** epoch ms when the user consented to cloud sync transmission of their data, null = not given */
  sync: number | null;
  /** epoch ms when the user consented to publishing notes to public share pages, null = not given */
  publish: number | null;
  /** epoch ms when the user consented to sharing name + study stats with buddy/group, null = not given */
  share: number | null;
  /** epoch ms when the user acknowledged the age / parental-consent notice on first launch, null = not yet */
  age: number | null;
}

export interface Settings {
  theme: ThemeId;
  dark: boolean;
  background: BackgroundConfig;
  mascotName: string;
  studyBuddyName: string;
  alarmSound?: boolean;
  pomodoro: PomodoroSettings;
  ambient: { track: string | null; volume: number };
  sync: SyncSettings;
  reducedMotion: boolean;
  mascotOutfit: string;
  locale: Locale;
  ai: AiSettings;
  guard: GuardSettings;
  accessibility: AccessibilitySettings;
  legal: LegalConsents;
  onboarding: OnboardingState;
}

export type Locale = 'en' | 'es' | 'ja' | 'ne';

export interface AiSettings {
  provider: 'local' | 'openai';
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface GuardSettings {
  enabled: boolean;
  mode: 'off' | 'nudge' | 'shield' | 'snap';
  blockedApps: string[];
  blockedSites: string[];
}

export interface AccessibilitySettings {
  dyslexiaFont: boolean;
  ttsEnabled: boolean;
  ttsVoice: string;
  speechRate: number;
}

export interface BuddyState {
  pairCode: string | null;
  partnerName: string | null;
  groupCode: string | null;
}

// ===== V2: flashcards & spaced repetition =====

export type SrsState = 'new' | 'learning' | 'review' | 'relearning';

export interface Srs {
  state: SrsState;
  ease: number;
  interval: number;
  due: number;
  reps: number;
  lapses: number;
  step: number;
  lastReviewedAt: number | null;
}

export type Rating = 'again' | 'hard' | 'good' | 'easy';

export interface Deck {
  id: ID;
  name: string;
  icon: string;
  color: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export type CardTemplate = 'basic' | 'reverse' | 'cloze';

export interface Flashcard {
  id: ID;
  deckId: ID;
  front: string;
  back: string;
  template: CardTemplate;
  tags: string[];
  sourceNoteId: ID | null;
  srs: Srs;
  createdAt: number;
  updatedAt: number;
}

export interface ReviewLog {
  id: ID;
  cardId: ID;
  deckId: ID;
  rating: Rating;
  reviewedAt: number;
  prevInterval: number;
  nextInterval: number;
}

// ===== V2: mood tracker =====

export interface MoodEntry {
  id: ID;
  date: string;
  level: number;
  note: string;
  createdAt: number;
  updatedAt: number;
}

// ===== V2/V3: documents & annotation =====

export type InkTool = 'pen' | 'marker' | 'highlighter' | 'glitter' | 'rainbow' | 'neon' | 'eraser';

export interface InkPoint {
  x: number;
  y: number;
  p: number;
}

export interface InkStroke {
  tool: InkTool;
  color: string;
  size: number;
  scrollY: number;
  points: InkPoint[];
}

export interface StudyDoc {
  id: ID;
  name: string;
  kind: 'pdf' | 'image';
  dataUrl: string;
  noteId: ID | null;
  annotations: InkStroke[];
  createdAt: number;
  updatedAt: number;
}

// ===== V3: sharing =====

export interface NoteShare {
  slug: string;
  publishedAt: number;
}

export type MascotMood = 'idle' | 'cheer' | 'study' | 'sleep' | 'sad' | 'love' | 'think';

export type UiEventType = 'celebrate' | 'sessionDone' | 'achievement' | 'encourage';

export interface UiEvent {
  id: ID;
  type: UiEventType;
  at: number;
  message?: string;
}

export interface CutepadData {
  version: number;
  subjects: Subject[];
  folders: Folder[];
  notes: Note[];
  blocks: TimeBlock[];
  tasks: Task[];
  sessions: SessionLog[];
  stickies: Sticky[];
  reminders: Reminder[];
  achievements: AchievementUnlock[];
  decks: Deck[];
  flashcards: Flashcard[];
  reviewLogs: ReviewLog[];
  moods: MoodEntry[];
  docs: StudyDoc[];
  unlockedStickers: string[];
  unlockedOutfits: string[];
  settings: Settings;
  buddy: BuddyState;
  auth: AuthState;
  updatedAt: number;
}

export type SyncStateName = 'off' | 'offline' | 'syncing' | 'synced' | 'error';

export interface SyncStatus {
  state: SyncStateName;
  lastSyncedAt: number | null;
  error: string | null;
}
