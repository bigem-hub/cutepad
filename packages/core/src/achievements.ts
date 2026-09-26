import { dayKey } from './defaults';
import { deriveStats, type DerivedStats } from './analytics';
import type { CutepadData } from './types';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  check: (stats: DerivedStats, data: CutepadData) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-note', name: 'First Page', desc: 'Write your very first note', icon: '📝', check: (s) => s.notesCount >= 1 },
  { id: 'note-sprout', name: 'Note Sprout', desc: 'Write 10 notes', icon: '📗', check: (s) => s.notesCount >= 10 },
  { id: 'doodle-star', name: 'Doodle Star', desc: 'Save a drawing inside a note', icon: '🌈', check: (_s, d) => d.notes.some((n) => !!n.drawing) },
  { id: 'first-focus', name: 'First Focus', desc: 'Finish your first study session', icon: '🍅', check: (s) => s.totalSessions >= 1 },
  { id: 'pomodoro-10', name: 'Pomodoro Pal', desc: 'Complete 10 focus sessions', icon: '⏰', check: (s) => s.totalSessions >= 10 },
  { id: 'pomodoro-50', name: 'Focus Master', desc: 'Complete 50 focus sessions', icon: '🏆', check: (s) => s.totalSessions >= 50 },
  { id: 'hours-10', name: 'Ten Hour Hero', desc: 'Study for 10 total hours', icon: '⭐', check: (s) => s.totalMinutes >= 600 },
  { id: 'hours-50', name: 'Study Legend', desc: 'Study for 50 total hours', icon: '🌟', check: (s) => s.totalMinutes >= 3000 },
  { id: 'streak-3', name: 'Three Day Spark', desc: 'Keep a 3-day streak', icon: '🔥', check: (s) => s.streak >= 3 },
  { id: 'streak-7', name: 'Week of Wonder', desc: 'Keep a 7-day streak', icon: '💫', check: (s) => s.streak >= 7 },
  { id: 'streak-30', name: 'Monthly Moon', desc: 'Keep a 30-day streak', icon: '🌙', check: (s) => s.streak >= 30 },
  { id: 'task-10', name: 'Tick Tock', desc: 'Complete 10 tasks', icon: '✅', check: (s) => s.completedTasks >= 10 },
  { id: 'task-25', name: 'Task Star', desc: 'Complete 25 tasks', icon: '🌟', check: (s) => s.completedTasks >= 25 },
  {
    id: 'early-bird',
    name: 'Early Bird',
    desc: 'Study before 8 AM',
    icon: '🐦',
    check: (_s, d) => d.sessions.some((s) => s.kind !== 'break' && new Date(s.startedAt).getHours() < 8),
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    desc: 'Study after 10 PM',
    icon: '🦉',
    check: (_s, d) => d.sessions.some((s) => s.kind !== 'break' && new Date(s.startedAt).getHours() >= 22),
  },
  { id: 'planner-pro', name: 'Planner Pro', desc: 'Schedule 7 study blocks', icon: '🗓️', check: (_s, d) => d.blocks.length >= 7 },
];

export function newlyUnlocked(data: CutepadData): AchievementDef[] {
  const stats = deriveStats({ sessions: data.sessions, tasks: data.tasks, notesCount: data.notes.length });
  const owned = new Set(data.achievements.map((a) => a.id));
  return ACHIEVEMENTS.filter((a) => !owned.has(a.id) && a.check(stats, data));
}

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function describeAchievement(id: string): string {
  return achievementById(id)?.name ?? id;
}

export function evaluateDailyGoal(stats: DerivedStats, goalMinutes = 60): { pct: number; met: boolean; date: string } {
  const pct = Math.min(100, Math.round((stats.minutesToday / Math.max(1, goalMinutes)) * 100));
  return { pct, met: stats.minutesToday >= goalMinutes, date: dayKey() };
}
