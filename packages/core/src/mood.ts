import { dayKey, todayKey } from './defaults';
import { lastDays } from './analytics';
import type { MoodEntry, SessionLog } from './types';

export interface MoodDef {
  level: number;
  emoji: string;
  name: string;
  color: string;
}

export const MOODS: MoodDef[] = [
  { level: 1, emoji: '😣', name: 'Rough', color: '#ffb3c6' },
  { level: 2, emoji: '😴', name: 'Tired', color: '#cde4ff' },
  { level: 3, emoji: '😐', name: 'Okay', color: '#ffe9a8' },
  { level: 4, emoji: '😊', name: 'Good', color: '#c8f0d8' },
  { level: 5, emoji: '🌸', name: 'Great', color: '#ffd1e3' },
];

export function moodDef(level: number): MoodDef {
  return MOODS.find((m) => m.level === level) ?? MOODS[2];
}

export function moodOn(moods: MoodEntry[], date: string): MoodEntry | null {
  return moods.find((m) => m.date === date) ?? null;
}

export function todayMood(moods: MoodEntry[]): MoodEntry | null {
  return moodOn(moods, todayKey());
}

export function moodSeries(moods: MoodEntry[], days = 14): { date: string; level: number | null }[] {
  return lastDays(days).map((date) => ({ date, level: moodOn(moods, date)?.level ?? null }));
}

export function moodStreak(moods: MoodEntry[]): number {
  const set = new Set(moods.map((m) => m.date));
  let streak = 0;
  const cursor = new Date();
  if (!set.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (set.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function avgMinutesByMood(moods: MoodEntry[], sessions: SessionLog[]): { level: number; avgMinutes: number; days: number }[] {
  const minutesByDay = new Map<string, number>();
  for (const s of sessions) {
    if (s.kind === 'break') continue;
    const key = dayKey(s.startedAt);
    minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + s.minutes);
  }
  return MOODS.map((m) => {
    const entries = moods.filter((e) => e.level === m.level);
    if (entries.length === 0) return { level: m.level, avgMinutes: 0, days: 0 };
    const total = entries.reduce((sum, e) => sum + (minutesByDay.get(e.date) ?? 0), 0);
    return { level: m.level, avgMinutes: Math.round(total / entries.length), days: entries.length };
  });
}

export function moodStudyRows(moods: MoodEntry[], sessions: SessionLog[]): { date: string; level: number; minutes: number }[] {
  const minutesByDay = new Map<string, number>();
  for (const s of sessions) {
    if (s.kind === 'break') continue;
    const key = dayKey(s.startedAt);
    minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + s.minutes);
  }
  return [...moods]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => ({ date: m.date, level: m.level, minutes: minutesByDay.get(m.date) ?? 0 }));
}

export function moodDistribution(moods: MoodEntry[]): { level: number; count: number }[] {
  return MOODS.map((m) => ({ level: m.level, count: moods.filter((e) => e.level === m.level).length }));
}
