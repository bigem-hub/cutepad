import { dayKey, todayKey } from './defaults';
import type { SessionLog, Subject, Task } from './types';

const DAY_MS = 86400000;

export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}

export function focusSessions(sessions: SessionLog[]): SessionLog[] {
  return sessions.filter((s) => s.kind !== 'break');
}

export function totalMinutes(sessions: SessionLog[]): number {
  return sessions.reduce((sum, s) => sum + s.minutes, 0);
}

export function minutesOn(sessions: SessionLog[], dateKey: string): number {
  return sessions
    .filter((s) => s.kind !== 'break' && dayKey(s.startedAt) === dateKey)
    .reduce((sum, s) => sum + s.minutes, 0);
}

export function minutesToday(sessions: SessionLog[]): number {
  return minutesOn(sessions, todayKey());
}

export function sessionsToday(sessions: SessionLog[]): number {
  const t = todayKey();
  return sessions.filter((s) => s.kind !== 'break' && dayKey(s.startedAt) === t).length;
}

export function lastDays(count: number, from: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    keys.push(dayKey(new Date(from.getTime() - i * DAY_MS)));
  }
  return keys;
}

export function dailyMinutes(sessions: SessionLog[], days = 14): { date: string; minutes: number }[] {
  const keys = lastDays(days);
  return keys.map((date) => ({ date, minutes: minutesOn(sessions, date) }));
}

export function activeDaySet(sessions: SessionLog[], tasks: Task[]): Set<string> {
  const set = new Set<string>();
  for (const s of sessions) if (s.kind !== 'break') set.add(dayKey(s.startedAt));
  for (const t of tasks) if (t.done && t.completedAt) set.add(dayKey(t.completedAt));
  return set;
}

export function streaks(sessions: SessionLog[], tasks: Task[]): { current: number; best: number } {
  const days = activeDaySet(sessions, tasks);
  const today = todayKey();
  let cursor = new Date();
  if (!days.has(today)) {
    cursor = new Date(Date.now() - DAY_MS);
    if (!days.has(dayKey(cursor))) {
      return { current: 0, best: bestRun(days) };
    }
  }
  let current = 0;
  while (days.has(dayKey(cursor))) {
    current++;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return { current, best: Math.max(bestRun(days), current) };
}

function bestRun(days: Set<string>): number {
  if (days.size === 0) return 0;
  const sorted = [...days].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]).getTime();
    const cur = new Date(sorted[i]).getTime();
    if (Math.round((cur - prev) / DAY_MS) === 1) {
      run++;
      best = Math.max(best, run);
    } else if (cur !== prev) {
      run = 1;
    }
  }
  return best;
}

export function subjectTotals(
  sessions: SessionLog[],
  subjects: Subject[],
): { subject: Subject | null; minutes: number; name: string; color: string }[] {
  const totals = new Map<string, number>();
  for (const s of sessions) {
    if (s.kind === 'break') continue;
    const key = s.subjectId ?? 'none';
    totals.set(key, (totals.get(key) ?? 0) + s.minutes);
  }
  const rows = [...totals.entries()].map(([id, minutes]) => {
    const subject = subjects.find((s) => s.id === id) ?? null;
    return {
      subject,
      minutes,
      name: subject?.name ?? 'Unsorted',
      color: subject?.color ?? '#e3d1ff',
    };
  });
  return rows.sort((a, b) => b.minutes - a.minutes);
}

export function weekComparison(sessions: SessionLog[]): { thisWeek: number; lastWeek: number; delta: number } {
  const now = Date.now();
  const weekMs = 7 * DAY_MS;
  let thisWeek = 0;
  let lastWeek = 0;
  for (const s of sessions) {
    if (s.kind === 'break') continue;
    const age = now - s.startedAt;
    if (age <= weekMs) thisWeek += s.minutes;
    else if (age <= 2 * weekMs) lastWeek += s.minutes;
  }
  const delta = lastWeek === 0 ? (thisWeek > 0 ? 100 : 0) : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  return { thisWeek, lastWeek, delta };
}

export interface DerivedStats {
  totalMinutes: number;
  totalSessions: number;
  completedTasks: number;
  notesCount: number;
  streak: number;
  bestStreak: number;
  minutesToday: number;
  sessionsToday: number;
}

export function deriveStats(input: {
  sessions: SessionLog[];
  tasks: Task[];
  notesCount: number;
}): DerivedStats {
  const focus = focusSessions(input.sessions);
  const s = streaks(input.sessions, input.tasks);
  return {
    totalMinutes: totalMinutes(focus),
    totalSessions: focus.length,
    completedTasks: input.tasks.filter((t) => t.done).length,
    notesCount: input.notesCount,
    streak: s.current,
    bestStreak: s.best,
    minutesToday: minutesToday(input.sessions),
    sessionsToday: sessionsToday(input.sessions),
  };
}

export interface PlantStage {
  index: number;
  label: string;
  emoji: string;
}

const PLANT_STAGES: { min: number; label: string; emoji: string }[] = [
  { min: 0, label: 'Seed', emoji: '🌱' },
  { min: 30, label: 'Sprout', emoji: '🌿' },
  { min: 120, label: 'Seedling', emoji: '🪴' },
  { min: 300, label: 'Sapling', emoji: '🌳' },
  { min: 600, label: 'Blooming', emoji: '🌸' },
  { min: 1200, label: 'Flourishing', emoji: '💮' },
];

export function plantStage(totalMin: number): PlantStage {
  let idx = 0;
  for (let i = 0; i < PLANT_STAGES.length; i++) {
    if (totalMin >= PLANT_STAGES[i].min) idx = i;
  }
  const next = PLANT_STAGES[idx + 1];
  return { index: idx, label: PLANT_STAGES[idx].label, emoji: PLANT_STAGES[idx].emoji, ...(next ? {} : {}) };
}

export function plantProgress(totalMin: number): { current: PlantStage; nextAt: number | null; pct: number } {
  const current = plantStage(totalMin);
  const nextDef = PLANT_STAGES[current.index + 1];
  if (!nextDef) return { current, nextAt: null, pct: 100 };
  const prevAt = PLANT_STAGES[current.index].min;
  const pct = Math.min(100, Math.round(((totalMin - prevAt) / (nextDef.min - prevAt)) * 100));
  return { current, nextAt: nextDef.min, pct };
}

export function completionRate(tasks: Task[], days = 30): { rate: number; done: number; total: number } {
  const cutoff = Date.now() - days * DAY_MS;
  const inWindow = tasks.filter((t) => t.createdAt >= cutoff || (t.done && (t.completedAt ?? 0) >= cutoff));
  const done = inWindow.filter((t) => t.done).length;
  return { rate: inWindow.length === 0 ? 0 : Math.round((done / inWindow.length) * 100), done, total: inWindow.length };
}

export function focusTrend(sessions: SessionLog[], days = 30): { date: string; minutes: number; avg7: number }[] {
  const rows = dailyMinutes(sessions, days);
  return rows.map((row, i) => {
    const from = Math.max(0, i - 6);
    const window = rows.slice(from, i + 1);
    const avg7 = Math.round(window.reduce((sum, w) => sum + w.minutes, 0) / window.length);
    return { ...row, avg7 };
  });
}

export function subjectShares(
  sessions: SessionLog[],
  subjects: Subject[],
): { name: string; color: string; minutes: number; pct: number }[] {
  const rows = subjectTotals(sessions, subjects);
  const total = rows.reduce((sum, r) => sum + r.minutes, 0) || 1;
  return rows.map((r) => ({ name: r.name, color: r.color, minutes: r.minutes, pct: Math.round((r.minutes / total) * 100) }));
}

export function weekdayDistribution(sessions: SessionLog[]): { day: string; minutes: number }[] {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const buckets = names.map((day) => ({ day, minutes: 0 }));
  for (const s of sessions) {
    if (s.kind === 'break') continue;
    buckets[new Date(s.startedAt).getDay()].minutes += s.minutes;
  }
  return buckets;
}

export function hourDistribution(sessions: SessionLog[]): { hour: number; minutes: number }[] {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, minutes: 0 }));
  for (const s of sessions) {
    if (s.kind === 'break') continue;
    buckets[new Date(s.startedAt).getHours()].minutes += s.minutes;
  }
  return buckets;
}

export function activeDays(sessions: SessionLog[], days = 30): number {
  return new Set(sessions.filter((s) => s.kind !== 'break' && s.startedAt >= Date.now() - days * DAY_MS).map((s) => dayKey(s.startedAt))).size;
}

export function dailyAverage(sessions: SessionLog[], days = 30): number {
  const active = activeDays(sessions, days);
  if (active === 0) return 0;
  const total = sessions
    .filter((s) => s.kind !== 'break' && s.startedAt >= Date.now() - days * DAY_MS)
    .reduce((sum, s) => sum + s.minutes, 0);
  return Math.round(total / active);
}
