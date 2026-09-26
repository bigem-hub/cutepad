import type { Flashcard, Rating, ReviewLog, Srs } from './types';
import { uid } from './defaults';

const DAY = 86400000;
const LEARNING_STEPS_MIN = [1, 10];
const RELEARN_STEPS_MIN = [5];

export function freshSrs(now = Date.now()): Srs {
  return { state: 'new', ease: 2.5, interval: 0, due: now, reps: 0, lapses: 0, step: 0, lastReviewedAt: null };
}

function graduate(srs: Srs, intervalDays: number, now: number): Srs {
  return {
    ...srs,
    state: 'review',
    interval: intervalDays,
    due: now + intervalDays * DAY,
    step: 0,
    reps: srs.reps + 1,
    lastReviewedAt: now,
  };
}

export function applyRating(card: Flashcard, rating: Rating, now = Date.now()): { srs: Srs; log: Omit<ReviewLog, 'id'> } {
  const prev = card.srs;
  let next: Srs;

  if (prev.state === 'new' || prev.state === 'learning') {
    if (rating === 'again') {
      next = { ...prev, state: 'learning', step: 0, due: now + LEARNING_STEPS_MIN[0] * 60000, reps: prev.reps, lastReviewedAt: now };
    } else if (rating === 'hard') {
      next = { ...prev, state: 'learning', due: now + 5 * 60000, reps: prev.reps, lastReviewedAt: now };
    } else if (rating === 'good') {
      const step = prev.step + 1;
      if (step < LEARNING_STEPS_MIN.length) {
        next = { ...prev, state: 'learning', step, due: now + LEARNING_STEPS_MIN[step] * 60000, reps: prev.reps, lastReviewedAt: now };
      } else {
        next = graduate(prev, 1, now);
      }
    } else {
      next = graduate(prev, 4, now);
    }
  } else if (prev.state === 'relearning') {
    if (rating === 'again') {
      next = { ...prev, state: 'relearning', step: 0, due: now + RELEARN_STEPS_MIN[0] * 60000, lastReviewedAt: now };
    } else if (rating === 'hard') {
      next = { ...prev, state: 'relearning', due: now + 10 * 60000, lastReviewedAt: now };
    } else {
      const interval = Math.max(1, prev.interval * 1.0);
      next = graduate({ ...prev, interval }, interval, now);
    }
  } else {
    // review
    let ease = prev.ease;
    let interval = prev.interval;
    let lapses = prev.lapses;
    if (rating === 'again') {
      ease = Math.max(1.3, ease - 0.2);
      lapses = lapses + 1;
      next = { ...prev, ease, state: 'relearning', interval: 0, step: 0, due: now + RELEARN_STEPS_MIN[0] * 60000, reps: prev.reps, lapses, lastReviewedAt: now };
    } else if (rating === 'hard') {
      ease = Math.max(1.3, ease - 0.15);
      interval = Math.max(1, Math.round(Math.max(prev.interval + 1, prev.interval * 1.2)));
      next = graduate({ ...prev, ease, interval, lapses }, interval, now);
    } else if (rating === 'good') {
      interval = Math.max(1, Math.round(Math.max(prev.interval + 1, prev.interval * ease)));
      next = graduate({ ...prev, ease, interval, lapses }, interval, now);
    } else {
      ease = Math.min(3.2, ease + 0.15);
      interval = Math.max(4, Math.round(Math.max(prev.interval + 1, prev.interval * ease * 1.3)));
      next = graduate({ ...prev, ease, interval, lapses }, interval, now);
    }
  }

  return {
    srs: next,
    log: {
      cardId: card.id,
      deckId: card.deckId,
      rating,
      reviewedAt: now,
      prevInterval: prev.interval,
      nextInterval: next.interval,
    },
  };
}

export function isDue(card: Flashcard, now = Date.now()): boolean {
  return card.srs.due <= now;
}

export function dueCards(cards: Flashcard[], now = Date.now()): Flashcard[] {
  return cards
    .filter((c) => isDue(c, now))
    .sort((a, b) => a.srs.due - b.srs.due);
}

export function newCards(cards: Flashcard[]): Flashcard[] {
  return cards.filter((c) => c.srs.state === 'new');
}

export function previewIntervals(card: Flashcard, now = Date.now()): Record<Rating, string> {
  const fmt = (srs: Srs): string => {
    if (srs.interval >= 1) return `${Math.round(srs.interval)}d`;
    const min = Math.max(1, Math.round((srs.due - now) / 60000));
    if (min >= 60) return `${Math.round(min / 60)}h`;
    return `${min}m`;
  };
  const out = {} as Record<Rating, string>;
  for (const rating of ['again', 'hard', 'good', 'easy'] as Rating[]) {
    out[rating] = fmt(applyRating(card, rating, now).srs);
  }
  return out;
}

export function reviewLog(l: Omit<ReviewLog, 'id'>): ReviewLog {
  return { ...l, id: uid() };
}

export function deckProgress(cards: Flashcard[], now = Date.now()): { total: number; learned: number; learning: number; due: number } {
  let learned = 0;
  let learning = 0;
  let due = 0;
  for (const c of cards) {
    if (c.srs.state === 'review') learned += 1;
    else if (c.srs.state !== 'new') learning += 1;
    if (isDue(c, now)) due += 1;
  }
  return { total: cards.length, learned, learning, due };
}

export function retentionRate(logs: ReviewLog[]): number {
  if (logs.length === 0) return 0;
  const good = logs.filter((l) => l.rating === 'good' || l.rating === 'easy').length;
  return Math.round((good / logs.length) * 100);
}
