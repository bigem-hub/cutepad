const REMOVE_ENTIRELY = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'BASE', 'AUDIO', 'VIDEO']);
const UNWRAP = new Set(['FONT']);
const ALLOWED = new Set([
  'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'SUB', 'SUP',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'HR',
  'SPAN', 'DIV', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH',
  'FIGURE', 'FIGCAPTION', 'A', 'IMG', 'SECTION', 'ARTICLE',
]);

const URI_ATTRS = new Set(['href', 'src']);

function safeUri(value: string): string | null {
  const trimmed = value.trim().replace(/[\u0000-\u001f\u007f]/g, '');
  const lower = trimmed.toLowerCase().replace(/\s+/g, '');
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:text/html')) return null;
  return trimmed;
}

function cleanStyle(value: string): string | null {
  if (/expression\s*\(|javascript:/i.test(value)) return null;
  return value;
}

function walk(node: Node): void {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child as Element;
    const tag = el.tagName.toUpperCase();
    if (REMOVE_ENTIRELY.has(tag)) {
      el.remove();
      continue;
    }
    if (UNWRAP.has(tag)) {
      while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
      el.remove();
      continue;
    }
    if (!ALLOWED.has(tag)) {
      while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
      el.remove();
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (URI_ATTRS.has(name)) {
        const safe = safeUri(attr.value);
        if (safe === null) el.removeAttribute(attr.name);
        else el.setAttribute(attr.name, safe);
        continue;
      }
      if (name === 'style') {
        const safe = cleanStyle(attr.value);
        if (safe === null) el.removeAttribute(attr.name);
        else el.setAttribute(attr.name, safe);
        continue;
      }
      if (name === 'class' || name === 'id') continue;
      el.removeAttribute(attr.name);
    }
    if (tag === 'A') {
      const href = (el.getAttribute('href') ?? '').toLowerCase();
      if (href.startsWith('http://') || href.startsWith('https://')) {
        el.setAttribute('rel', 'noopener noreferrer nofollow');
        el.setAttribute('target', '_blank');
      }
    }
    walk(el);
  }
}

/**
 * Strip anything that could execute script or load remote resources from
 * note HTML rendered on the public share page (defense-in-depth alongside CSP).
 */
export function sanitizeNoteHtml(html: string): string {
  if (!html) return '';
  try {
    const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html');
    const root = doc.getElementById('root');
    if (!root) return '';
    walk(root);
    return root.innerHTML;
  } catch {
    return '';
  }
}
