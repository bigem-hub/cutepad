import { dayKey } from './defaults';
import type { Reminder } from './types';

export function dueReminders(reminders: Reminder[], now: Date = new Date()): Reminder[] {
  const hh = `${now.getHours()}`.padStart(2, '0');
  const mm = `${now.getMinutes()}`.padStart(2, '0');
  const time = `${hh}:${mm}`;
  const today = dayKey(now);
  return reminders.filter(
    (r) => r.enabled && r.time === time && r.days.includes(now.getDay()) && r.lastFired !== today,
  );
}

export function formatTime12(time: string): string {
  const [hRaw, mRaw] = time.split(':');
  const h = Number(hRaw ?? 0);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mRaw ?? '00'} ${suffix}`;
}

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_DAYS = [1, 2, 3, 4, 5];
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
