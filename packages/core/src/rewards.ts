import { deriveStats, type DerivedStats } from './analytics';
import type { CutepadData } from './types';

export interface StickerDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  check: (stats: DerivedStats, data: CutepadData) => boolean;
}

export interface OutfitDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  check: (stats: DerivedStats, data: CutepadData) => boolean;
}

export const STICKERS: StickerDef[] = [
  { id: 'st-start', name: 'First Steps', emoji: '🐣', desc: 'Finish your first focus session', check: (s) => s.totalSessions >= 1 },
  { id: 'st-hour1', name: 'Clock Buddy', emoji: '⏰', desc: 'Study for 1 hour total', check: (s) => s.totalMinutes >= 60 },
  { id: 'st-hour10', name: 'Ten-Hour Star', emoji: '🌟', desc: 'Study for 10 hours total', check: (s) => s.totalMinutes >= 600 },
  { id: 'st-streak3', name: 'Warm Flame', emoji: '🔥', desc: 'Keep a 3-day streak', check: (s) => s.streak >= 3 },
  { id: 'st-streak7', name: 'Rainbow Week', emoji: '🌈', desc: 'Keep a 7-day streak', check: (s) => s.streak >= 7 },
  { id: 'st-notes5', name: 'Scribbler', emoji: '✍️', desc: 'Write 5 notes', check: (s) => s.notesCount >= 5 },
  { id: 'st-notes20', name: 'Note Dragon', emoji: '🐲', desc: 'Write 20 notes', check: (s) => s.notesCount >= 20 },
  { id: 'st-tasks10', name: 'Checklist Champ', emoji: '✅', desc: 'Complete 10 tasks', check: (s) => s.completedTasks >= 10 },
  { id: 'st-deck1', name: 'Deck Maker', emoji: '🎴', desc: 'Create a flashcard deck', check: (_s, d) => d.decks.length >= 2 },
  { id: 'st-review25', name: 'Memory Pal', emoji: '🧠', desc: 'Review 25 flashcards', check: (_s, d) => d.reviewLogs.length >= 25 },
  { id: 'st-review100', name: 'Memory Master', emoji: '🦉', desc: 'Review 100 flashcards', check: (_s, d) => d.reviewLogs.length >= 100 },
  { id: 'st-mood7', name: 'Feelings Friend', emoji: '💗', desc: 'Log your mood 7 times', check: (_s, d) => d.moods.length >= 7 },
  { id: 'st-draw1', name: 'Art Sprite', emoji: '🎨', desc: 'Save a drawing in a note', check: (_s, d) => d.notes.some((n) => !!n.drawing) },
  { id: 'st-doc1', name: 'Archivist', emoji: '📎', desc: 'Import a document to annotate', check: (_s, d) => d.docs.length >= 1 },
  { id: 'st-badge5', name: 'Trophy Shelf', emoji: '🏆', desc: 'Unlock 5 badges', check: (_s, d) => d.achievements.length >= 5 },
  { id: 'st-badge16', name: 'Completionist', emoji: '👑', desc: 'Unlock every badge', check: (_s, d) => d.achievements.length >= 16 },
  { id: 'st-share1', name: 'Open Book', emoji: '🌐', desc: 'Publish a note page', check: (_s, d) => d.notes.some((n) => !!n.share) },
  { id: 'st-early', name: 'Sunrise Scholar', emoji: '🌅', desc: 'Study before 8 AM', check: (_s, d) => d.sessions.some((x) => x.kind !== 'break' && new Date(x.startedAt).getHours() < 8) },
];

export const OUTFITS: OutfitDef[] = [
  { id: 'bow', name: 'Pink Bow', emoji: '🎀', desc: 'Reach a 3-day streak', check: (s) => s.streak >= 3 },
  { id: 'glasses', name: 'Round Glasses', emoji: '👓', desc: 'Write 5 notes', check: (s) => s.notesCount >= 5 },
  { id: 'beret', name: 'Artist Beret', emoji: '🎨', desc: 'Finish 5 focus sessions', check: (s) => s.totalSessions >= 5 },
  { id: 'scarf', name: 'Cozy Scarf', emoji: '🧣', desc: 'Study 5 hours total', check: (s) => s.totalMinutes >= 300 },
  { id: 'headphones', name: 'Study Headphones', emoji: '🎧', desc: 'Complete 25 flashcard reviews', check: (_s, d) => d.reviewLogs.length >= 25 },
  { id: 'crown', name: 'Star Crown', emoji: '⭐', desc: 'Unlock 10 badges', check: (_s, d) => d.achievements.length >= 10 },
  { id: 'halo', name: 'Angel Halo', emoji: '😇', desc: 'Keep a 14-day streak', check: (s) => s.streak >= 14 },
];

export interface RewardUnlock {
  stickers: StickerDef[];
  outfits: OutfitDef[];
}

export function newlyUnlockedRewards(data: CutepadData): RewardUnlock {
  const stats = deriveStats({ sessions: data.sessions, tasks: data.tasks, notesCount: data.notes.length });
  const ownedS = new Set(data.unlockedStickers);
  const ownedO = new Set(data.unlockedOutfits);
  return {
    stickers: STICKERS.filter((s) => !ownedS.has(s.id) && s.check(stats, data)),
    outfits: OUTFITS.filter((o) => !ownedO.has(o.id) && o.check(stats, data)),
  };
}

export function stickerById(id: string): StickerDef | undefined {
  return STICKERS.find((s) => s.id === id);
}

export function outfitById(id: string): OutfitDef | undefined {
  return OUTFITS.find((o) => o.id === id);
}
