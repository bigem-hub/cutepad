import type { AiSettings, CardTemplate, CutepadData, Task } from './types';
import { dayKey, todayKey, uid } from './defaults';

export interface GeneratedCard {
  front: string;
  back: string;
  template: CardTemplate;
}

export interface QuizItem {
  question: string;
  options: string[];
  answer: number;
}

export interface ScheduleSuggestion {
  id: string;
  date: string;
  startMin: number;
  durationMin: number;
  title: string;
  subjectId: string | null;
  reason: string;
}

export type AiEngine = 'local' | 'remote';

const STOP = new Set(
  ('the a an and or but if then else of in on at to for from by with as is are was were be been being this that these those it its i you he she they we me him her us them my your our their not no yes do does did done have has had can could should would will shall may might must about into over under again more most other some such only own same very too also just because while during before after above below up down out off once here there when where why how all any both each few nor own so than too s t don now'.split(
    ' ',
  ) as string[]).map((w) => w),
);

function sentences(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    buf += ch;
    if (ch === '.' || ch === '!' || ch === '?') {
      const next = text[i + 1] ?? ' ';
      if (/\s/.test(next)) {
        const cleaned = buf.trim();
        if (cleaned.length > 1) out.push(cleaned);
        buf = '';
      }
    } else if (ch === '\n') {
      const cleaned = buf.trim();
      if (cleaned.length > 1) out.push(cleaned);
      buf = '';
    }
  }
  const tail = buf.trim();
  if (tail.length > 1) out.push(tail);
  return out.map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.split(' ').length >= 4);
}

function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-zà-ÿ0-9][a-zà-ÿ0-9'-]*/g) ?? []).filter((w) => w.length > 2 && !STOP.has(w));
}

export function wordFrequencies(text: string): Map<string, number> {
  const freq = new Map<string, number>();
  for (const w of words(text)) freq.set(w, (freq.get(w) ?? 0) + 1);
  return freq;
}

export function keyTerms(text: string, n = 8): { term: string; count: number }[] {
  const freq = wordFrequencies(text);
  return [...freq.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([term, count]) => ({ term, count }));
}

export function summarizeLocal(text: string, maxBullets = 6, title = ''): string[] {
  const sents = sentences(text);
  if (sents.length <= maxBullets) return sents;
  const freq = wordFrequencies(text);
  const titleTerms = new Set(words(title));
  const scored = sents.map((sentence, index) => {
    const ws = words(sentence);
    let score = 0;
    for (const w of ws) score += freq.get(w) ?? 0;
    score = score / Math.pow(Math.max(ws.length, 4), 0.75);
    if (index === 0) score *= 1.35;
    if (index === 1) score *= 1.12;
    for (const w of ws) if (titleTerms.has(w)) score += 0.4;
    if (ws.length < 7) score *= 0.6;
    return { sentence, index, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxBullets)
    .sort((a, b) => a.index - b.index)
    .map((x) => x.sentence);
}

export function cardsFromText(text: string, limit = 12): GeneratedCard[] {
  const out: GeneratedCard[] = [];
  const seen = new Set<string>();
  const push = (card: GeneratedCard) => {
    const key = card.front.toLowerCase();
    if (seen.has(key) || out.length >= limit) return;
    seen.add(key);
    out.push(card);
  };

  const defs = text.matchAll(/^[\t ]*(?:[-•*]\s*)?([A-Za-zÀ-ÿ][\w \-/']{1,48})\s+(?:is|are|refers to|means|describes|defined as)\s+(.{10,180}?)(?:[.!?]|$)/gm);
  for (const m of defs) {
    push({ front: `What is ${m[1].trim()}?`, back: `${m[1].trim()} — ${m[2].trim().replace(/[.!]$/, '')}.`, template: 'basic' });
  }

  const colons = text.matchAll(/^[\t ]*(?:[-•*]\s*)?([A-Za-zÀ-ÿ][\w \-/']{1,48}):\s+(.{6,160})$/gm);
  for (const m of colons) {
    push({ front: m[1].trim(), back: m[2].trim(), template: 'basic' });
  }

  const freq = wordFrequencies(text);
  for (const sentence of sentences(text)) {
    if (out.length >= limit) break;
    const ws = words(sentence);
    if (ws.length < 6) continue;
    const candidates = ws.filter((w) => (freq.get(w) ?? 0) >= 2 && w.length >= 5).sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0));
    const target = candidates[0];
    if (!target) continue;
    const cloze = sentence.replace(new RegExp(`\\b${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), `[[${target}]]`);
    if (!cloze.includes('[[')) continue;
    push({ front: cloze, back: sentence, template: 'cloze' });
  }

  return out;
}

export function quizFromText(text: string, limit = 5): QuizItem[] {
  const freq = wordFrequencies(text);
  const pool = [...freq.entries()]
    .filter(([w, c]) => w.length >= 5 && c >= 2)
    .map(([w]) => w);
  if (pool.length < 4) {
    for (const [w] of freq) {
      if (w.length >= 5 && !pool.includes(w)) pool.push(w);
      if (pool.length >= 8) break;
    }
  }
  const items: QuizItem[] = [];
  const used = new Set<string>();
  for (const sentence of sentences(text)) {
    if (items.length >= limit) break;
    const ws = words(sentence).filter((w) => w.length >= 5 && pool.includes(w));
    const target = ws.find((w) => !used.has(w));
    if (!target) continue;
    used.add(target);
    const question = sentence.replace(new RegExp(`\\b${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), '______');
    const distractors = shuffle(pool.filter((w) => w !== target)).slice(0, 3);
    while (distractors.length < 3) {
      const filler = `term${distractors.length + 1}`;
      if (!distractors.includes(filler)) distractors.push(filler);
    }
    const options = shuffle([target, ...distractors]);
    items.push({ question: `Fill in the blank: "${question}"`, options, answer: options.indexOf(target) });
  }
  return items;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function aiSuggestSchedule(data: CutepadData): ScheduleSuggestion[] {
  const out: ScheduleSuggestion[] = [];
  const today = todayKey();
  const now = new Date();
  const minutesToday = data.sessions
    .filter((s) => s.kind !== 'break' && dayKey(s.startedAt) === today)
    .reduce((sum, s) => sum + s.minutes, 0);
  const due = (t: Task) => t.due && t.due < today;

  for (const t of data.tasks.filter((x) => !x.done && due(x)).slice(0, 3)) {
    out.push({
      id: uid(),
      date: today,
      startMin: 16 * 60,
      durationMin: 45,
      title: `Catch up: ${t.title}`,
      subjectId: t.subjectId,
      reason: `Overdue since ${t.due} — clear it first.`,
    });
  }
  for (const t of data.tasks.filter((x) => !x.done && x.due && x.due >= today).sort((a, b) => (a.due ?? '').localeCompare(b.due ?? '')).slice(0, 3)) {
    const dueDate = new Date(`${t.due}T00:00:00`);
    const lead = new Date(dueDate.getTime() - 86400000);
    const date = dayKey(lead) >= today ? dayKey(lead) : today;
    out.push({
      id: uid(),
      date,
      startMin: 17 * 60,
      durationMin: 45,
      title: `Prepare: ${t.title}`,
      subjectId: t.subjectId,
      reason: `Due ${t.due} — a day before is the sweet spot.`,
    });
  }

  const dueCards = data.flashcards.filter((c) => c.srs.due <= Date.now()).length;
  if (dueCards > 0) {
    out.push({
      id: uid(),
      date: today,
      startMin: Math.max(9 * 60, Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15),
      durationMin: 15,
      title: `Review ${dueCards} flashcards`,
      subjectId: null,
      reason: 'Your spaced-repetition queue is waiting.',
    });
  }

  if (minutesToday === 0 && now.getHours() >= 18) {
    out.push({
      id: uid(),
      date: today,
      startMin: Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15,
      durationMin: 25,
      title: 'Quick focus session',
      subjectId: null,
      reason: 'No minutes logged yet today — a short one keeps your streak alive 🔥',
    });
  }

  const weekAgo = Date.now() - 7 * 86400000;
  const weekMinutes = new Map<string, number>();
  for (const s of data.sessions) {
    if (s.kind === 'break' || s.startedAt < weekAgo) continue;
    if (!s.subjectId) continue;
    weekMinutes.set(s.subjectId, (weekMinutes.get(s.subjectId) ?? 0) + s.minutes);
  }
  for (const subject of data.subjects) {
    if (out.length >= 6) break;
    const openTasks = data.tasks.filter((t) => !t.done && t.subjectId === subject.id).length;
    if (openTasks > 0 && (weekMinutes.get(subject.id) ?? 0) === 0) {
      out.push({
        id: uid(),
        date: dayKey(Date.now() + 86400000),
        startMin: 15 * 60,
        durationMin: 60,
        title: `Reconnect with ${subject.name}`,
        subjectId: subject.id,
        reason: `${openTasks} open task${openTasks > 1 ? 's' : ''} but zero study time this week.`,
      });
    }
  }
  return out.slice(0, 6);
}

// ===== remote (optional, OpenAI-compatible) =====

function remoteConfigured(ai: AiSettings): boolean {
  return ai.provider === 'openai' && !!ai.apiKey;
}

async function chat(ai: AiSettings, system: string, user: string): Promise<string> {
  const base = (ai.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ai.apiKey}` },
    body: JSON.stringify({
      model: ai.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`ai request failed (${res.status})`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('ai returned no content');
  return content;
}

function parseJson<T>(raw: string): T | null {
  const match = raw.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

export async function aiSummarize(text: string, title: string, ai: AiSettings): Promise<{ bullets: string[]; engine: AiEngine }> {
  if (remoteConfigured(ai)) {
    try {
      const raw = await chat(
        ai,
        'You are a study assistant. Answer with plain text bullet points only, no preamble, max the requested number of lines.',
        `Summarize these study notes into at most 6 short bullet points. Title: ${title || 'Untitled'}\n\nNotes:\n${text.slice(0, 6000)}`,
      );
      const bullets = raw
        .split('\n')
        .map((l) => l.replace(/^\s*[-•*\d.)\]]+\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 6);
      if (bullets.length > 0) return { bullets, engine: 'remote' };
    } catch {
      /* fall through to local */
    }
  }
  return { bullets: summarizeLocal(text, 6, title), engine: 'local' };
}

export async function aiMakeCards(text: string, title: string, ai: AiSettings, limit = 10): Promise<{ cards: GeneratedCard[]; engine: AiEngine }> {
  if (remoteConfigured(ai)) {
    try {
      const raw = await chat(
        ai,
        'You create flashcards from study notes. Respond ONLY with a JSON array of {"front": string, "back": string}.',
        `Create up to ${limit} Q&A flashcards (JSON array only) from these notes. Title: ${title || 'Untitled'}\n\n${text.slice(0, 6000)}`,
      );
      const parsed = parseJson<{ front?: string; back?: string }[]>(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cards = parsed
          .filter((c) => typeof c.front === 'string' && typeof c.back === 'string')
          .slice(0, limit)
          .map((c) => ({ front: c.front as string, back: c.back as string, template: 'basic' as CardTemplate }));
        if (cards.length > 0) return { cards, engine: 'remote' };
      }
    } catch {
      /* fall through */
    }
  }
  return { cards: cardsFromText(text, limit), engine: 'local' };
}

export async function aiMakeQuiz(text: string, title: string, ai: AiSettings, limit = 5): Promise<{ quiz: QuizItem[]; engine: AiEngine }> {
  if (remoteConfigured(ai)) {
    try {
      const raw = await chat(
        ai,
        'You create multiple-choice quizzes. Respond ONLY with a JSON array of {"question": string, "options": string[4], "answer": number} where answer is the index of the correct option.',
        `Create ${limit} multiple-choice questions (JSON array only) from these notes. Title: ${title || 'Untitled'}\n\n${text.slice(0, 6000)}`,
      );
      const parsed = parseJson<{ question?: string; options?: string[]; answer?: number }[]>(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const quiz = parsed
          .filter((q) => typeof q.question === 'string' && Array.isArray(q.options) && typeof q.answer === 'number')
          .slice(0, limit) as QuizItem[];
        if (quiz.length > 0) return { quiz, engine: 'remote' };
      }
    } catch {
      /* fall through */
    }
  }
  return { quiz: quizFromText(text, limit), engine: 'local' };
}
