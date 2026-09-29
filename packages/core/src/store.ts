import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { getBridge } from './bridge';
import { newlyUnlocked } from './achievements';
import { newlyUnlockedRewards } from './rewards';
import { applyRating, freshSrs as freshCardSrs, reviewLog as makeReviewLog } from './srs';
import { createInitialData, normalizeData, uid, todayKey, PALETTE, NOTE_COLORS, STICKY_COLORS } from './defaults';
import type {
  AchievementUnlock,
  BuddyState,
  CardTemplate,
  CutepadData,
  Deck,
  Flashcard,
  Folder,
  InkStroke,
  MascotMood,
  MoodEntry,
  Note,
  Priority,
  Rating,
  Reminder,
  ReviewLog,
  SessionKind,
  Settings,
  Sticky,
  StudyDoc,
  Subject,
  SyncStatus,
  Task,
  TimeBlock,
  UiEvent,
  UiEventType,
} from './types';

// ===== AI key at rest: encrypt in localStorage with the OS keychain (Electron safeStorage).
// On the web there is no bridge → the key is stored as-is (documented limitation).
const SECURE_PREFIX = 'enc:v1:';
const AI_KEY_SNIP = '"apiKey":"';

function transformAiKey(json: string, direction: 'encrypt' | 'decrypt'): string {
  if (json.includes('"apiKey":""')) return json; // no key stored — nothing to transform
  if (!json.includes(AI_KEY_SNIP)) return json;
  const bridge = getBridge();
  if (!bridge?.secureSync) return json;
  try {
    const parsed = JSON.parse(json) as { state?: { settings?: { ai?: { apiKey?: unknown } } } };
    const ai = parsed?.state?.settings?.ai;
    const key = ai?.apiKey;
    if (typeof key !== 'string' || key.length === 0) return json;
    if (direction === 'encrypt') {
      if (key.startsWith(SECURE_PREFIX)) return json;
      const enc = bridge.secureSync('encrypt', key);
      if (!enc?.startsWith(SECURE_PREFIX)) return json;
      ai!.apiKey = enc;
    } else {
      if (!key.startsWith(SECURE_PREFIX)) return json;
      // decrypt failed (other device / OS keychain reset) → drop the key so the user re-enters it
      ai!.apiKey = bridge.secureSync('decrypt', key) ?? '';
    }
    return JSON.stringify(parsed);
  } catch {
    return json;
  }
}

const secureLocalStorage: StateStorage = {
  getItem: (name) => {
    const raw = localStorage.getItem(name);
    return raw === null ? null : transformAiKey(raw, 'decrypt');
  },
  setItem: (name, value) => {
    localStorage.setItem(name, transformAiKey(value, 'encrypt'));
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
  },
};

export interface AddNoteInput {
  title?: string;
  html?: string;
  folderId?: string | null;
  color?: string;
}

export interface AddTaskInput {
  title: string;
  subjectId?: string | null;
  priority?: Priority;
  due?: string | null;
}

export interface AddBlockInput {
  title: string;
  date: string;
  startMin: number;
  durationMin?: number;
  subjectId?: string | null;
  color?: string;
}

export interface AddReminderInput {
  title: string;
  time: string;
  days: number[];
  subjectId?: string | null;
}

export interface AddCardInput {
  deckId: string;
  front: string;
  back: string;
  template?: CardTemplate;
  tags?: string[];
  sourceNoteId?: string | null;
}

interface AppState extends CutepadData {
  mood: MascotMood;
  moodSince: number;
  events: UiEvent[];
  lastInteraction: number;
  sync: SyncStatus;
  saveError: string | null;
  guardActive: boolean;

  setMood: (mood: MascotMood) => void;
  touch: () => void;
  pushEvent: (type: UiEventType, message?: string) => void;
  removeEvent: (id: string) => void;
  clearEvents: () => void;
  setGuardActive: (active: boolean) => void;

  addSubject: (name: string, color: string, icon: string) => string;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  removeSubject: (id: string) => void;

  addFolder: (name: string, icon: string, color: string) => string;
  updateFolder: (id: string, patch: Partial<Folder>) => void;
  removeFolder: (id: string) => void;

  addNote: (input?: AddNoteInput) => string;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  togglePin: (id: string) => void;

  addBlock: (input: AddBlockInput) => string;
  updateBlock: (id: string, patch: Partial<TimeBlock>) => void;
  deleteBlock: (id: string) => void;

  addTask: (input: AddTaskInput) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;

  logSession: (input: { subjectId: string | null; minutes: number; kind: SessionKind; startedAt?: number }) => string;

  addSticky: (input?: Partial<Sticky>) => string;
  updateSticky: (id: string, patch: Partial<Sticky>) => void;
  deleteSticky: (id: string) => void;

  addReminder: (input: AddReminderInput) => string;
  updateReminder: (id: string, patch: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  fireReminder: (id: string) => void;

  unlockAchievement: (id: string) => void;

  addDeck: (name: string, icon?: string, color?: string, description?: string) => string;
  updateDeck: (id: string, patch: Partial<Deck>) => void;
  deleteDeck: (id: string) => void;
  addCard: (input: AddCardInput) => string;
  updateCard: (id: string, patch: Partial<Flashcard>) => void;
  deleteCard: (id: string) => void;
  importCards: (deckId: string, cards: { front: string; back: string }[]) => number;
  reviewCard: (id: string, rating: Rating) => void;

  logMood: (level: number, note?: string) => void;
  deleteMood: (date: string) => void;

  addDoc: (input: Omit<StudyDoc, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateDoc: (id: string, patch: Partial<StudyDoc>) => void;
  deleteDoc: (id: string) => void;
  setDocAnnotations: (id: string, annotations: InkStroke[]) => void;

  setSettings: (patch: SettingsPatch) => void;
  setBuddy: (patch: Partial<BuddyState>) => void;
  setAuth: (patch: Partial<CutepadData['auth']>) => void;
  completeOnboarding: () => void;
  setOnboardingStep: (step: number) => void;
  setSyncStatus: (patch: Partial<SyncStatus>) => void;
  setSaveError: (message: string | null) => void;

  importData: (data: CutepadData) => void;
  resetAll: () => void;
}

function pickData(state: AppState): CutepadData {
  return {
    version: state.version,
    subjects: state.subjects,
    folders: state.folders,
    notes: state.notes,
    blocks: state.blocks,
    tasks: state.tasks,
    sessions: state.sessions,
    stickies: state.stickies,
    reminders: state.reminders,
    achievements: state.achievements,
    decks: state.decks,
    flashcards: state.flashcards,
    reviewLogs: state.reviewLogs,
    moods: state.moods,
    docs: state.docs,
    unlockedStickers: state.unlockedStickers,
    unlockedOutfits: state.unlockedOutfits,
    settings: state.settings,
    buddy: state.buddy,
    auth: state.auth,
    updatedAt: state.updatedAt,
  };
}

export type SettingsPatch = Omit<Partial<Settings>, 'pomodoro' | 'sync' | 'ambient' | 'ai' | 'guard' | 'accessibility'> & {
  pomodoro?: Partial<Settings['pomodoro']>;
  sync?: Partial<Settings['sync']>;
  ambient?: Partial<Settings['ambient']>;
  ai?: Partial<Settings['ai']>;
  guard?: Partial<Settings['guard']>;
  accessibility?: Partial<Settings['accessibility']>;
};

function mergeSettings(current: Settings, patch: SettingsPatch): Settings {
  const out: Record<string, unknown> = { ...current, ...patch };
  for (const key of Object.keys(patch) as (keyof Settings)[]) {
    const next = patch[key];
    const prev = current[key];
    if (
      next &&
      typeof next === 'object' &&
      !Array.isArray(next) &&
      prev &&
      typeof prev === 'object' &&
      !Array.isArray(prev)
    ) {
      out[key] = { ...(prev as object), ...(next as object) };
    }
  }
  return out as unknown as Settings;
}

function achievementPatch(state: AppState): Partial<AppState> {
  const unlocked = newlyUnlocked(pickData(state));
  const rewards = newlyUnlockedRewards(pickData(state));
  if (unlocked.length === 0 && rewards.stickers.length === 0 && rewards.outfits.length === 0) return {};
  const now = Date.now();
  const additions: AchievementUnlock[] = unlocked.map((a) => ({ id: a.id, at: now }));
  const events: UiEvent[] = [
    ...unlocked.map((a) => ({
      id: uid(),
      type: 'achievement' as UiEventType,
      at: now,
      message: `${a.icon} ${a.name} unlocked!`,
    })),
    ...rewards.stickers.map((s) => ({
      id: uid(),
      type: 'achievement' as UiEventType,
      at: now,
      message: `${s.emoji} Sticker “${s.name}” collected!`,
    })),
    ...rewards.outfits.map((o) => ({
      id: uid(),
      type: 'achievement' as UiEventType,
      at: now,
      message: `${o.emoji} ${o.name} outfit unlocked!`,
    })),
  ];
  const patch: Partial<AppState> = {
    achievements: [...state.achievements, ...additions],
    events: [...state.events, ...events],
    unlockedStickers: [...state.unlockedStickers, ...rewards.stickers.map((s) => s.id)],
    unlockedOutfits: [...state.unlockedOutfits, ...rewards.outfits.map((o) => o.id)],
    mood: 'cheer',
    moodSince: now,
  };
  if (rewards.outfits.length > 0 && state.settings.mascotOutfit === 'none') {
    patch.settings = { ...state.settings, mascotOutfit: rewards.outfits[0].id };
  }
  return patch;
}

const initial = createInitialData();

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...initial,

      mood: 'idle',
      moodSince: Date.now(),
      events: [],
      lastInteraction: Date.now(),
      sync: { state: 'off', lastSyncedAt: null, error: null },
      saveError: null,
      guardActive: false,

      setMood: (mood) => set({ mood, moodSince: Date.now() }),
      touch: () => set({ lastInteraction: Date.now() }),
      pushEvent: (type, message) =>
        set((s) => ({ events: [...s.events, { id: uid(), type, at: Date.now(), message }] })),
      removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
      clearEvents: () => set({ events: [] }),
      setGuardActive: (active) => set({ guardActive: active }),

      addSubject: (name, color, icon) => {
        const id = uid();
        set((s) => ({ subjects: [...s.subjects, { id, name, color, icon }], updatedAt: Date.now() }));
        return id;
      },
      updateSubject: (id, patch) =>
        set((s) => ({
          subjects: s.subjects.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          updatedAt: Date.now(),
        })),
      removeSubject: (id) =>
        set((s) => ({
          subjects: s.subjects.filter((x) => x.id !== id),
          blocks: s.blocks.map((b) => (b.subjectId === id ? { ...b, subjectId: null } : b)),
          tasks: s.tasks.map((t) => (t.subjectId === id ? { ...t, subjectId: null } : t)),
          updatedAt: Date.now(),
        })),

      addFolder: (name, icon, color) => {
        const id = uid();
        set((s) => ({ folders: [...s.folders, { id, name, icon, color, createdAt: Date.now() }], updatedAt: Date.now() }));
        return id;
      },
      updateFolder: (id, patch) =>
        set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, ...patch } : f)), updatedAt: Date.now() })),
      removeFolder: (id) =>
        set((s) => ({
          folders: s.folders.filter((f) => f.id !== id),
          notes: s.notes.map((n) => (n.folderId === id ? { ...n, folderId: null, updatedAt: Date.now() } : n)),
          updatedAt: Date.now(),
        })),

      addNote: (input = {}) => {
        const now = Date.now();
        const id = uid();
        const note: Note = {
          id,
          folderId: input.folderId ?? get().folders[0]?.id ?? null,
          title: input.title ?? '',
          html: input.html ?? '',
          text: stripHtml(input.html ?? ''),
          tags: [],
          drawing: null,
          color: input.color ?? NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
          pinned: false,
          share: null,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ notes: [note, ...s.notes], updatedAt: now, ...achievementPatch(s) }));
        return id;
      },
      updateNote: (id, patch) =>
        set((s) => {
          const notes = s.notes.map((n) =>
            n.id === id
              ? { ...n, ...patch, text: patch.html !== undefined ? stripHtml(patch.html) : n.text, updatedAt: Date.now() }
              : n,
          );
          return { notes, updatedAt: Date.now(), ...achievementPatch({ ...s, notes }) };
        }),
      deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id), updatedAt: Date.now() })),
      togglePin: (id) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned, updatedAt: Date.now() } : n)),
          updatedAt: Date.now(),
        })),

      addBlock: (input) => {
        const id = uid();
        const subject = input.subjectId ? get().subjects.find((x) => x.id === input.subjectId) : null;
        const block: TimeBlock = {
          id,
          title: input.title,
          subjectId: input.subjectId ?? null,
          date: input.date,
          startMin: input.startMin,
          durationMin: input.durationMin ?? 60,
          color: input.color ?? subject?.color ?? PALETTE[Math.floor(Math.random() * PALETTE.length)],
        };
        set((s) => ({ blocks: [...s.blocks, block], updatedAt: Date.now(), ...achievementPatch(s) }));
        return id;
      },
      updateBlock: (id, patch) =>
        set((s) => ({ blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)), updatedAt: Date.now() })),
      deleteBlock: (id) => set((s) => ({ blocks: s.blocks.filter((b) => b.id !== id), updatedAt: Date.now() })),

      addTask: (input) => {
        const id = uid();
        const task: Task = {
          id,
          title: input.title,
          subjectId: input.subjectId ?? null,
          priority: input.priority ?? 'medium',
          due: input.due ?? null,
          done: false,
          createdAt: Date.now(),
          completedAt: null,
        };
        set((s) => ({ tasks: [task, ...s.tasks], updatedAt: Date.now() }));
        return id;
      },
      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const next = { ...t, ...patch };
            // moving a deadline re-arms its alarm
            if (patch.due !== undefined && patch.due !== t.due) next.dueAlarmed = false;
            return next;
          }),
          updatedAt: Date.now(),
        })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id), updatedAt: Date.now() })),
      toggleTask: (id) =>
        set((s) => {
          const now = Date.now();
          let celebrated = false;
          const tasks = s.tasks.map((t) => {
            if (t.id !== id) return t;
            const done = !t.done;
            if (done) celebrated = true;
            return { ...t, done, completedAt: done ? now : null };
          });
          const patch: Partial<AppState> = { tasks, updatedAt: now };
          if (celebrated) {
            patch.mood = 'cheer';
            patch.moodSince = now;
            patch.events = [...s.events, { id: uid(), type: 'celebrate' as UiEventType, at: now, message: 'Yay! One less thing~ ✨' }];
          }
          return { ...patch, ...achievementPatch({ ...s, tasks }) };
        }),

      logSession: (input) => {
        const now = Date.now();
        const startedAt = input.startedAt ?? now - Math.round(input.minutes * 60000);
        const session = {
          id: uid(),
          subjectId: input.subjectId ?? null,
          kind: input.kind,
          minutes: Math.max(1, Math.round(input.minutes)),
          startedAt,
          endedAt: now,
        };
        set((s) => {
          const patch: Partial<AppState> = {
            sessions: [...s.sessions, session],
            updatedAt: now,
            mood: 'cheer',
            moodSince: now,
            events:
              input.kind === 'break'
                ? s.events
                : [...s.events, { id: uid(), type: 'sessionDone' as UiEventType, at: now, message: `+${session.minutes} min of studying! 🌸` }],
          };
          return { ...patch, ...achievementPatch({ ...s, sessions: [...s.sessions, session] }) };
        });
        return session.id;
      },

      addSticky: (input = {}) => {
        const id = uid();
        const sticky: Sticky = {
          id,
          text: input.text ?? '',
          color: input.color ?? STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
          x: input.x ?? 80 + Math.floor(Math.random() * 200),
          y: input.y ?? 80 + Math.floor(Math.random() * 160),
          w: input.w ?? 230,
          h: input.h ?? 180,
          z: input.z ?? 10,
          updatedAt: Date.now(),
        };
        set((s) => ({ stickies: [...s.stickies, sticky], updatedAt: Date.now() }));
        return id;
      },
      updateSticky: (id, patch) =>
        set((s) => ({
          stickies: s.stickies.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x)),
          updatedAt: Date.now(),
        })),
      deleteSticky: (id) => set((s) => ({ stickies: s.stickies.filter((x) => x.id !== id), updatedAt: Date.now() })),

      addReminder: (input) => {
        const id = uid();
        const reminder: Reminder = {
          id,
          title: input.title,
          time: input.time,
          days: input.days,
          subjectId: input.subjectId ?? null,
          enabled: true,
          lastFired: null,
        };
        set((s) => ({ reminders: [...s.reminders, reminder], updatedAt: Date.now() }));
        return id;
      },
      updateReminder: (id, patch) =>
        set((s) => ({ reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)), updatedAt: Date.now() })),
      deleteReminder: (id) => set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id), updatedAt: Date.now() })),
      fireReminder: (id) =>
        set((s) => ({
          reminders: s.reminders.map((r) => (r.id === id ? { ...r, lastFired: todayKey() } : r)),
          updatedAt: Date.now(),
        })),

      unlockAchievement: (id) =>
        set((s) => {
          if (s.achievements.some((a) => a.id === id)) return {};
          const now = Date.now();
          return {
            achievements: [...s.achievements, { id, at: now }],
            events: [...s.events, { id: uid(), type: 'achievement' as UiEventType, at: now, message: `${id} unlocked!` }],
            mood: 'cheer',
            moodSince: now,
          };
        }),

      addDeck: (name, icon = '🎴', color = PALETTE[1], description = '') => {
        const id = uid();
        const now = Date.now();
        set((s) => ({
          decks: [...s.decks, { id, name, icon, color, description, createdAt: now, updatedAt: now }],
          updatedAt: now,
          ...achievementPatch(s),
        }));
        return id;
      },
      updateDeck: (id, patch) =>
        set((s) => ({
          decks: s.decks.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d)),
          updatedAt: Date.now(),
        })),
      deleteDeck: (id) =>
        set((s) => ({
          decks: s.decks.filter((d) => d.id !== id),
          flashcards: s.flashcards.filter((c) => c.deckId !== id),
          updatedAt: Date.now(),
        })),
      addCard: (input) => {
        const id = uid();
        const now = Date.now();
        const card: Flashcard = {
          id,
          deckId: input.deckId,
          front: input.front,
          back: input.back,
          template: input.template ?? 'basic',
          tags: input.tags ?? [],
          sourceNoteId: input.sourceNoteId ?? null,
          srs: freshCardSrs(now),
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ flashcards: [card, ...s.flashcards], updatedAt: now, ...achievementPatch(s) }));
        return id;
      },
      updateCard: (id, patch) =>
        set((s) => ({
          flashcards: s.flashcards.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c)),
          updatedAt: Date.now(),
        })),
      deleteCard: (id) =>
        set((s) => ({ flashcards: s.flashcards.filter((c) => c.id !== id), updatedAt: Date.now() })),
      importCards: (deckId, cards) => {
        const now = Date.now();
        const added: Flashcard[] = cards
          .filter((c) => c.front.trim() && c.back.trim())
          .map((c) => ({
            id: uid(),
            deckId,
            front: c.front.trim(),
            back: c.back.trim(),
            template: 'basic' as CardTemplate,
            tags: [],
            sourceNoteId: null,
            srs: freshCardSrs(now),
            createdAt: now,
            updatedAt: now,
          }));
        if (added.length === 0) return 0;
        set((s) => ({ flashcards: [...added, ...s.flashcards], updatedAt: now, ...achievementPatch(s) }));
        return added.length;
      },
      reviewCard: (id, rating) =>
        set((s) => {
          const card = s.flashcards.find((c) => c.id === id);
          if (!card) return {};
          const now = Date.now();
          const { srs, log } = applyRating(card, rating, now);
          const flashcards = s.flashcards.map((c) => (c.id === id ? { ...c, srs, updatedAt: now } : c));
          const reviewLogs = [makeReviewLog(log), ...s.reviewLogs];
          return { flashcards, reviewLogs, updatedAt: now, ...achievementPatch({ ...s, flashcards, reviewLogs }) };
        }),

      logMood: (level, note = '') =>
        set((s) => {
          const now = Date.now();
          const date = todayKey();
          const existing = s.moods.find((m) => m.date === date);
          const moods = existing
            ? s.moods.map((m) => (m.date === date ? { ...m, level, note, updatedAt: now } : m))
            : [...s.moods, { id: uid(), date, level, note, createdAt: now, updatedAt: now }];
          return { moods, updatedAt: now, ...achievementPatch({ ...s, moods }) };
        }),
      deleteMood: (date) => set((s) => ({ moods: s.moods.filter((m) => m.date !== date), updatedAt: Date.now() })),

      addDoc: (input) => {
        const id = uid();
        const now = Date.now();
        const doc: StudyDoc = { ...input, id, createdAt: now, updatedAt: now };
        set((s) => ({ docs: [doc, ...s.docs], updatedAt: now, ...achievementPatch(s) }));
        return id;
      },
      updateDoc: (id, patch) =>
        set((s) => ({
          docs: s.docs.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d)),
          updatedAt: Date.now(),
        })),
      deleteDoc: (id) => set((s) => ({ docs: s.docs.filter((d) => d.id !== id), updatedAt: Date.now() })),
      setDocAnnotations: (id, annotations) =>
        set((s) => ({
          docs: s.docs.map((d) => (d.id === id ? { ...d, annotations, updatedAt: Date.now() } : d)),
          updatedAt: Date.now(),
        })),

      setSettings: (patch) =>
        set((s) => ({ settings: mergeSettings(s.settings, patch), updatedAt: Date.now() })),
      setBuddy: (patch) => set((s) => ({ buddy: { ...s.buddy, ...patch }, updatedAt: Date.now() })),
      setAuth: (patch) =>
        set((s) => ({ auth: { ...s.auth, ...patch }, updatedAt: Date.now() })),
      completeOnboarding: () =>
        set((s) => ({
          settings: {
            ...s.settings,
            onboarding: { ...s.settings.onboarding, hasCompletedOnboarding: true },
          },
          updatedAt: Date.now(),
        })),
      setOnboardingStep: (step) =>
        set((s) => ({
          settings: {
            ...s.settings,
            onboarding: { ...s.settings.onboarding, step },
          },
          updatedAt: Date.now(),
        })),
      setSyncStatus: (patch) => set((s) => ({ sync: { ...s.sync, ...patch } })),
      setSaveError: (message) => set({ saveError: message }),

      importData: (data) =>
        set((s) => ({
          ...s,
          ...normalizeData(data, pickData(s)),
          mood: s.mood,
          events: s.events,
          updatedAt: Date.now(),
        })),
      resetAll: () =>
        set(() => ({ ...createInitialData(), guardActive: false, mood: 'idle', events: [], lastInteraction: Date.now() })),
    }),
    {
      name: 'cutepad-state',
      version: 1,
      storage: createJSONStorage(() => secureLocalStorage),
      partialize: (state) => pickData(state) as unknown as AppState,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CutepadData>;
        const data = normalizeData(p, current as unknown as CutepadData);
        return {
          ...current,
          ...data,
          mood: 'idle',
          moodSince: Date.now(),
          events: [],
          lastInteraction: Date.now(),
          sync: { state: 'off' as const, lastSyncedAt: null, error: null },
          saveError: null,
          guardActive: false,
        };
      },
    },
  ),
);

export function getState(): AppState {
  return useApp.getState();
}

export function selectData(state: AppState): CutepadData {
  return pickData(state);
}

function stripHtml(html: string): string {
  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent ?? '').replace(/\s+/g, ' ').trim();
  }
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
