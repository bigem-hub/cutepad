import type { Note } from './types';
import { NOTE_COLORS, uid } from './defaults';

export interface NoteTemplate {
  id: string;
  name: string;
  icon: string;
  desc: string;
  title: string;
  html: string;
  tags: string[];
}

const s = 'text-align:left;font-family:var(--font-body, sans-serif);';
const h = 'font-weight:700;color:#7a5c8e;margin:12px 0 6px;';
const box = 'border:2px dashed #e3c7e8;border-radius:14px;padding:10px 12px;background:#fdf7ff;';

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'blank',
    name: 'Blank note',
    icon: '📄',
    desc: 'Just an empty page',
    title: '',
    html: '<p><br></p>',
    tags: [],
  },
  {
    id: 'cornell',
    name: 'Cornell notes',
    icon: '📚',
    desc: 'Cue column · notes · summary',
    title: 'Cornell notes — ',
    html: `
<p style="${s}${h}">Topic</p><p style="${s}"><i>write the big idea here…</i></p>
<table style="${s}width:100%;border-collapse:collapse;">
  <tr>
    <td style="${box}width:30%;vertical-align:top;" contenteditable="false"><b>Cues</b><br><i>questions &amp; keywords</i></td>
    <td style="padding:0 10px;vertical-align:top;">${box.replace('border:2px', 'border:2px')}<b>Notes</b><br><i>main lecture notes</i></td>
  </tr>
</table>
<p style="${s}${h}">Summary</p><div style="${box}min-height:52px;"><i>2–3 sentences in your own words…</i></div>`.trim(),
    tags: ['cornell'],
  },
  {
    id: 'exam-prep',
    name: 'Exam prep sheet',
    icon: '🎯',
    desc: 'Key concepts, formulas & checklist',
    title: 'Exam prep — ',
    html: `
<p style="${s}${h}">📋 Exam details</p><p style="${s}"><b>Date:</b> ______ &nbsp; <b>Scope:</b> chapters ____</p>
<p style="${s}${h}">🔑 Key concepts</p><ul style="${s}"><li>concept 1</li><li>concept 2</li></ul>
<p style="${s}${h}">🧮 Formulas / must-memorize</p><ul style="${s}"><li>—</li></ul>
<p style="${s}${h}">✅ Practice checklist</p><ul style="${s}"><li>☐ review notes</li><li>☐ do past paper</li><li>☐ teach it to someone</li></ul>
<p style="${s}${h}">🩹 Weak spots</p><ul style="${s}"><li>—</li></ul>`.trim(),
    tags: ['exam'],
  },
  {
    id: 'weekly-review',
    name: 'Weekly review',
    icon: '🗓️',
    desc: 'Wins, struggles & next-week plan',
    title: 'Weekly review — ',
    html: `
<p style="${s}${h}">🌟 Wins this week</p><ul style="${s}"><li>—</li></ul>
<p style="${s}${h}">🌧️ Struggles</p><ul style="${s}"><li>—</li></ul>
<p style="${s}${h}">📆 Next week plan</p><ul style="${s}"><li>Mon: </li><li>Tue: </li><li>Wed: </li><li>Thu: </li><li>Fri: </li></ul>
<p style="${s}${h}">💪 Habit check</p><p style="${s}">streak · sleep · water · movement — how did it go?</p>`.trim(),
    tags: ['weekly'],
  },
  {
    id: 'lecture',
    name: 'Lecture notes',
    icon: '🎓',
    desc: 'Date, outline & questions',
    title: 'Lecture — ',
    html: `
<p style="${s}"><b>Date:</b> ______ &nbsp; <b>Lecturer:</b> ______</p>
<p style="${s}${h}">Outline</p><ul style="${s}"><li>point 1</li></ul>
<p style="${s}${h}">❓ Questions to ask / look up</p><ul style="${s}"><li>—</li></ul>
<p style="${s}${h}">🎯 One thing to review</p><p style="${s}"><i>—</i></p>`.trim(),
    tags: ['lecture'],
  },
  {
    id: 'reading',
    name: 'Reading notes',
    icon: '📖',
    desc: 'Summary, vocab & takeaways',
    title: 'Reading — ',
    html: `
<p style="${s}"><b>Book/chapter:</b> ______</p>
<p style="${s}${h}">📝 Summary</p><p style="${s}"><i>—</i></p>
<p style="${s}${h}">🆕 New vocabulary</p><ul style="${s}"><li>word — meaning</li></ul>
<p style="${s}${h}">💡 Takeaway</p><div style="${box}"><i>the one idea you'll remember…</i></div>`.trim(),
    tags: ['reading'],
  },
];

export function templateById(id: string): NoteTemplate | undefined {
  return NOTE_TEMPLATES.find((t) => t.id === id);
}

export function noteFromTemplate(templateId: string, folderId: string | null): Omit<Note, 'id' | 'createdAt' | 'updatedAt'> {
  const tpl = templateById(templateId) ?? NOTE_TEMPLATES[0];
  return {
    folderId,
    title: tpl.title,
    html: tpl.html,
    text: '',
    tags: [...tpl.tags],
    drawing: null,
    color: NOTE_COLORS[NOTE_TEMPLATES.indexOf(tpl) % NOTE_COLORS.length],
    pinned: false,
    share: null,
  };
}

export function makeNoteId(): string {
  return uid();
}
