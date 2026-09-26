import { dayKey } from './defaults';

export type SyllabusKind = 'assignment' | 'exam' | 'quiz' | 'reading' | 'event';

export interface SyllabusItem {
  date: string;
  time: string | null;
  title: string;
  kind: SyllabusKind;
  matchedText: string;
  confidence: number;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

const KEYWORDS: { re: RegExp; kind: SyllabusKind }[] = [
  { re: /\bexam\b|\bmidterm\b|\bfinal\b|\btest\b/i, kind: 'exam' },
  { re: /\bquiz\b/i, kind: 'quiz' },
  { re: /\bread(ing)?\b|\bchapter\b|\bch\.\s*\d/i, kind: 'reading' },
  { re: /\bassignment\b|\bhomework\b|\bhw\b|\bproject\b|\bsubmit\b|\bpaper\b|\bessay\b|\bworksheet\b/i, kind: 'assignment' },
];

function findDate(line: string, now: Date): { date: string; consumed: string } | null {
  let m: RegExpMatchArray | null;

  m = line.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (m) return { date: `${m[1]}-${m[2]}-${m[3]}`, consumed: m[0] };

  m = line.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const date = new Date(year, Number(m[1]) - 1, Number(m[2]));
    if (!Number.isNaN(date.getTime())) return { date: dayKey(date), consumed: m[0] };
  }

  m = line.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b/i);
  if (m) {
    const month = MONTHS[m[1].toLowerCase()];
    const date = new Date(Number(m[3]), month, Number(m[2]));
    if (!Number.isNaN(date.getTime())) return { date: dayKey(date), consumed: m[0] };
  }

  m = line.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
  if (m) {
    const month = MONTHS[m[1].toLowerCase()];
    if (month !== undefined) {
      let year = now.getFullYear();
      const date = new Date(year, month, Number(m[2]));
      if (date.getTime() < now.getTime() - 90 * 86400000) year += 1;
      const final = new Date(year, month, Number(m[2]));
      if (!Number.isNaN(final.getTime())) return { date: dayKey(final), consumed: m[0] };
    }
  }

  return null;
}

function findTime(line: string): string | null {
  const m = line.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (m) {
    let hour = Number(m[1]) % 12;
    if (m[3].toLowerCase() === 'pm') hour += 12;
    return `${String(hour).padStart(2, '0')}:${(m[2] ?? '00').padStart(2, '0')}`;
  }
  const military = line.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (military) return `${military[1].padStart(2, '0')}:${military[2]}`;
  return null;
}

function cleanTitle(line: string, datePart: string, timePart: string | null): string {
  let title = line;
  if (datePart) title = title.replace(datePart, ' ');
  if (timePart) title = title.replace(/\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/i, ' ').replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/, ' ');
  title = title
    .replace(/\b(due|deadline|submit|turn in|by|on|@)\b[:\s]*$/gi, ' ')
    .replace(/^[\s\-–—:*•]+|[\s\-–—:*•]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!title) title = 'Study session';
  return title.length > 90 ? `${title.slice(0, 87)}…` : title;
}

export function parseSyllabus(text: string): SyllabusItem[] {
  const now = new Date();
  const out: SyllabusItem[] = [];
  const seen = new Set<string>();
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length < 5 || line.length > 300) continue;
    const found = findDate(line, now);
    if (!found) continue;

    const date = new Date(`${found.date}T00:00:00`);
    if (Number.isNaN(date.getTime())) continue;
    const age = date.getTime() - now.getTime();
    if (age < -400 * 86400000 || age > 2 * 365 * 86400000) continue;

    const time = findTime(line);
    const keyword = KEYWORDS.find((k) => k.re.test(line));
    const kind: SyllabusKind = keyword?.kind ?? 'event';
    const title = cleanTitle(line, found.consumed, time);
    const key = `${found.date}|${title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      date: found.date,
      time,
      title,
      kind,
      matchedText: line,
      confidence: keyword ? 0.9 : 0.65,
    });
    if (out.length >= 60) break;
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function kindEmoji(kind: SyllabusKind): string {
  return kind === 'exam' ? '📕' : kind === 'quiz' ? '❓' : kind === 'reading' ? '📖' : kind === 'assignment' ? '📝' : '📌';
}
