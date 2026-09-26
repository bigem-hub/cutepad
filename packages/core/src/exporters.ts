import { getBridge } from './bridge';
import type { CutepadData, Note } from './types';

export type ExportFormat = 'txt' | 'md' | 'html' | 'pdf';

export function htmlToText(html: string): string {
  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
  }
  return html
    .replace(/<li[^>]*>/g, '\n- ')
    .replace(/<\/(p|div|h1|h2|h3|ul|ol)>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();
}

export function htmlToMarkdown(html: string): string {
  let out = html;
  out = out.replace(/<h1[^>]*>(.*?)<\/h1>/gis, '# $1\n\n');
  out = out.replace(/<h2[^>]*>(.*?)<\/h2>/gis, '## $1\n\n');
  out = out.replace(/<h3[^>]*>(.*?)<\/h3>/gis, '### $1\n\n');
  out = out.replace(/<strong[^>]*>(.*?)<\/strong>/gis, '**$1**');
  out = out.replace(/<b[^>]*>(.*?)<\/b>/gis, '**$1**');
  out = out.replace(/<em[^>]*>(.*?)<\/em>/gis, '*$1*');
  out = out.replace(/<i[^>]*>(.*?)<\/i>/gis, '*$1*');
  out = out.replace(/<u[^>]*>(.*?)<\/u>/gis, '_$1_');
  out = out.replace(/<s[^>]*>(.*?)<\/s>/gis, '~~$1~~');
  out = out.replace(/<mark[^>]*>(.*?)<\/mark>/gis, '==$1==');
  out = out.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gis, '[$2]($1)');
  out = out.replace(/<li[^>]*>(.*?)<\/li>/gis, '- $1\n');
  out = out.replace(/<\/(ul|ol)>/g, '\n');
  out = out.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1\n');
  out = out.replace(/<br\s*\/?>/g, '\n');
  out = out.replace(/<\/(p|div|h1|h2|h3)>/g, '\n\n');
  out = out.replace(/<img[^>]*src="([^"]*)"[^>]*>/g, '![sticker]($1)');
  out = out.replace(/<[^>]*>/g, '');
  out = out
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function safeFileName(name: string): string {
  return (name || 'untitled').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);
}

export function noteHtmlDocument(note: Note): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(note.title || 'Cutepad note')}</title>
<style>
  body { font-family: "Nunito", "Segoe UI", sans-serif; color: #3d2c3d; margin: 48px; line-height: 1.6; }
  h1,h2,h3 { font-family: "Fredoka", "Nunito", sans-serif; }
  mark { background: #fff3a8; }
  img { max-width: 100%; }
  .meta { color: #a58bb5; font-size: 12px; margin-bottom: 24px; }
</style></head><body>
<div class="meta">cutepad · ${new Date(note.updatedAt).toLocaleString()}</div>
<h1>${escapeHtml(note.title || 'Untitled note')}</h1>
${note.html}
${note.drawing ? `<h2>Doodle</h2><img src="${note.drawing}" alt="doodle"/>` : ''}
</body></html>`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export async function exportNote(note: Note, format: ExportFormat): Promise<void> {
  const base = safeFileName(note.title || 'cutepad-note');
  if (format === 'txt') {
    downloadFile(`${base}.txt`, `${note.title}\n\n${htmlToText(note.html)}`, 'text/plain;charset=utf-8');
    return;
  }
  if (format === 'md') {
    downloadFile(`${base}.md`, `# ${note.title || 'Untitled note'}\n\n${htmlToMarkdown(note.html)}`, 'text/markdown;charset=utf-8');
    return;
  }
  if (format === 'html') {
    downloadFile(`${base}.html`, noteHtmlDocument(note), 'text/html;charset=utf-8');
    return;
  }
  const bridge = getBridge();
  const html = noteHtmlDocument(note);
  if (bridge) {
    await bridge.exportPdf(html, `${base}.pdf`);
    return;
  }
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  window.setTimeout(() => {
    w.print();
    w.close();
  }, 350);
}

export function exportAllDataJson(data: CutepadData): void {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  downloadFile(`cutepad-backup-${stamp}.json`, JSON.stringify(data, null, 2), 'application/json');
}

export function parseImportJson(text: string): CutepadData {
  const parsed = JSON.parse(text) as CutepadData;
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.notes) || !parsed.settings) {
    throw new Error('That file does not look like a Cutepad backup.');
  }
  return parsed;
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}
