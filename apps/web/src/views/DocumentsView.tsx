import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as RPointerEvent,
} from 'react';
import { PALETTE, useApp, type InkPoint, type InkStroke, type InkTool, type StudyDoc } from '@cutepad/core';
import { EmptyState, MascotDock, Modal, Segmented } from '@cutepad/ui';
import { useT } from '../i18n';
import './DocumentsView.css';

type TFn = ReturnType<typeof useT>;
type Mode = 'nav' | 'draw';

interface PendingFile {
  name: string;
  dataUrl: string;
  kind: 'pdf' | 'image';
  sizeKb: number;
}

const MAX_BYTES = 10 * 1024 * 1024;
const INK_COLORS: string[] = [...PALETTE, '#ffffff', '#2b2340'];
const DEFAULT_COLOR = '#2b2340';

const TOOLS: { id: InkTool; emoji: string; key: string }[] = [
  { id: 'pen', emoji: '✏️', key: 'documents.toolPen' },
  { id: 'marker', emoji: '🖊️', key: 'documents.toolMarker' },
  { id: 'highlighter', emoji: '🖍️', key: 'documents.toolHighlighter' },
  { id: 'glitter', emoji: '✨', key: 'documents.toolGlitter' },
  { id: 'rainbow', emoji: '🌈', key: 'documents.toolRainbow' },
  { id: 'neon', emoji: '💡', key: 'documents.toolNeon' },
  { id: 'eraser', emoji: '🧽', key: 'documents.toolEraser' },
];

function seeded(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function canvasScale(w: number, h: number): number {
  const dpr = window.devicePixelRatio || 1;
  return Math.max(0.5, Math.min(dpr, 16000 / Math.max(w, h, 1)));
}

function resetCtx(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, scale: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function rainbowHue(stroke: InkStroke, index: number): number {
  const seed = Number(stroke.color);
  const base = Number.isFinite(seed) ? seed : 0;
  return (base + index * 15) % 360;
}

function applyInk(ctx: CanvasRenderingContext2D, stroke: InkStroke, hue: number | null): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'rgba(0, 0, 0, 0)';
  ctx.lineWidth = stroke.size;
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  if (hue !== null) {
    const css = `hsl(${hue}, 90%, 60%)`;
    ctx.strokeStyle = css;
    ctx.fillStyle = css;
    return;
  }
  if (stroke.tool === 'marker') {
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = stroke.size * 1.8;
  } else if (stroke.tool === 'highlighter') {
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = stroke.size * 3;
    ctx.lineCap = 'square';
  } else if (stroke.tool === 'neon') {
    ctx.shadowBlur = 10;
    ctx.shadowColor = stroke.color;
  }
}

function traceSmooth(ctx: CanvasRenderingContext2D, pts: readonly InkPoint[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
    return;
  }
  for (let i = 1; i < pts.length - 1; i += 1) {
    const cur = pts[i];
    const nxt = pts[i + 1];
    ctx.quadraticCurveTo(cur.x, cur.y, (cur.x + nxt.x) / 2, (cur.y + nxt.y) / 2);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
}

function sparkle(ctx: CanvasRenderingContext2D, stroke: InkStroke, index: number): void {
  if (index % 6 !== 0) return;
  const p = stroke.points[index];
  if (!p) return;
  const s = index * 7.3 + 11.7;
  const cx = p.x + (seeded(s) - 0.5) * 9;
  const cy = p.y + (seeded(s + 1) - 0.5) * 9;
  const r = 3 + seeded(s + 2) * 4;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.5 + seeded(s + 3) * 0.5;
  ctx.lineWidth = Math.max(1, stroke.size * 0.35);
  ctx.strokeStyle = seeded(s + 4) > 0.75 ? '#ffffff' : stroke.color;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();
  ctx.restore();
}

function paintDot(ctx: CanvasRenderingContext2D, stroke: InkStroke): void {
  const p = stroke.points[0];
  if (!p) return;
  ctx.save();
  applyInk(ctx, stroke, stroke.tool === 'rainbow' ? rainbowHue(stroke, 0) : null);
  ctx.beginPath();
  ctx.arc(p.x, p.y, Math.max(0.5, stroke.size / 2), 0, Math.PI * 2);
  ctx.fill();
  if (stroke.tool === 'glitter') sparkle(ctx, stroke, 0);
  ctx.restore();
}

function paintStroke(ctx: CanvasRenderingContext2D, stroke: InkStroke): void {
  if (stroke.tool === 'eraser') return;
  const pts = stroke.points;
  if (pts.length === 0) return;
  if (pts.length === 1) {
    paintDot(ctx, stroke);
    return;
  }
  ctx.save();
  if (stroke.tool === 'rainbow') {
    for (let i = 1; i < pts.length; i += 1) {
      const a = pts[i - 1];
      const b = pts[i];
      applyInk(ctx, stroke, rainbowHue(stroke, i));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  } else {
    applyInk(ctx, stroke, null);
    traceSmooth(ctx, pts);
    ctx.stroke();
    if (stroke.tool === 'glitter') {
      for (let i = 0; i < pts.length; i += 1) sparkle(ctx, stroke, i);
    }
  }
  ctx.restore();
}

function onScreen(stroke: InkStroke, dy: number, w: number, h: number): boolean {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of stroke.points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    const y = p.y + dy;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return !(maxX < 0 || minX > w || maxY < 0 || minY > h);
}

function DocViewer({ doc, onBack }: { doc: StudyDoc; onBack: () => void }) {
  const t: TFn = useT();
  const setDocAnnotations = useApp((s) => s.setDocAnnotations);
  const annotations = doc.annotations;

  const [mode, setMode] = useState<Mode>('draw');
  const [tool, setTool] = useState<InkTool>('pen');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [size, setSize] = useState(6);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [scrollTick, setScrollTick] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);
  const strokeRef = useRef<InkStroke | null>(null);
  const annRef = useRef<InkStroke[]>(annotations);
  const scaleRef = useRef(1);
  const rafRef = useRef(0);
  const erasingRef = useRef(false);

  useLayoutEffect(() => {
    annRef.current = annotations;
  }, [annotations]);

  const measure = () => {
    const el = wrapRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    setBox((prev) => (Math.abs(prev.w - w) < 1 && Math.abs(prev.h - h) < 1 ? prev : { w, h }));
  };

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = liveRef.current;
    if (!canvas) return;
    const onWheel = (ev: WheelEvent) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      ev.preventDefault();
      wrap.scrollTop += ev.deltaY;
      wrap.scrollLeft += ev.deltaX;
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const { w, h } = box;
    const base = baseRef.current;
    const live = liveRef.current;
    if (w < 2 || h < 2 || !base || !live) return;
    const scale = canvasScale(w, h);
    scaleRef.current = scale;

    const prep = (canvas: HTMLCanvasElement): CanvasRenderingContext2D | null => {
      const pw = Math.max(1, Math.round(w * scale));
      const ph = Math.max(1, Math.round(h * scale));
      if (canvas.width !== pw) canvas.width = pw;
      if (canvas.height !== ph) canvas.height = ph;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      resetCtx(ctx, canvas, scale);
      return ctx;
    };

    const baseCtx = prep(base);
    if (baseCtx) {
      const wrap = wrapRef.current;
      const scrollTop = wrap ? wrap.scrollTop : 0;
      for (const stroke of annotations) {
        const dy = stroke.scrollY - scrollTop;
        if (!onScreen(stroke, dy, w, h)) continue;
        baseCtx.save();
        baseCtx.translate(0, dy);
        paintStroke(baseCtx, stroke);
        baseCtx.restore();
      }
    }

    const liveCtx = prep(live);
    const liveStroke = strokeRef.current;
    if (liveCtx && liveStroke) {
      const wrap = wrapRef.current;
      const dy = liveStroke.scrollY - (wrap ? wrap.scrollTop : 0);
      liveCtx.save();
      liveCtx.translate(0, dy);
      paintStroke(liveCtx, liveStroke);
      liveCtx.restore();
    }
  }, [box, annotations, scrollTick]);

  const paintLive = () => {
    const canvas = liveRef.current;
    const stroke = strokeRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    resetCtx(ctx, canvas, scaleRef.current);
    if (!stroke) return;
    const wrap = wrapRef.current;
    const dy = stroke.scrollY - (wrap ? wrap.scrollTop : 0);
    ctx.save();
    ctx.translate(0, dy);
    paintStroke(ctx, stroke);
    ctx.restore();
  };

  const handleScroll = () => {
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0;
      setScrollTick((v) => v + 1);
    });
  };

  const toPoint = (e: RPointerEvent<HTMLCanvasElement>): InkPoint => {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = e.pointerType === 'pen' ? Math.min(1, Math.max(0, e.pressure || 0.5)) : 0.5;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, p };
  };

  const eraseAt = (pt: InkPoint) => {
    const current = annRef.current;
    const wrap = wrapRef.current;
    const scrollTop = wrap ? wrap.scrollTop : 0;
    const r = size * 2;
    const r2 = r * r;
    const next = current.filter((stroke) => {
      const dy = stroke.scrollY - scrollTop;
      return !stroke.points.some((p) => {
        const dx = p.x - pt.x;
        const py = p.y + dy - pt.y;
        return dx * dx + py * py <= r2;
      });
    });
    if (next.length === current.length) return;
    annRef.current = next;
    setDocAnnotations(doc.id, next);
  };

  const handleDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'draw' || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = toPoint(e);
    if (tool === 'eraser') {
      erasingRef.current = true;
      eraseAt(point);
      return;
    }
    const wrap = wrapRef.current;
    strokeRef.current = {
      tool,
      color: tool === 'rainbow' ? String(Math.floor(Math.random() * 360)) : color,
      size,
      scrollY: wrap ? wrap.scrollTop : 0,
      points: [point],
    };
    paintLive();
  };

  const handleMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'draw') return;
    if (erasingRef.current) {
      eraseAt(toPoint(e));
      return;
    }
    const stroke = strokeRef.current;
    if (!stroke) return;
    const next = toPoint(e);
    const last = stroke.points[stroke.points.length - 1];
    if (last) {
      const dx = next.x - last.x;
      const dy = next.y - last.y;
      if (dx * dx + dy * dy < 1.7) return;
    }
    stroke.points.push(next);
    paintLive();
  };

  const handleUp = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const stroke = strokeRef.current;
    strokeRef.current = null;
    erasingRef.current = false;
    paintLive();
    if (!stroke || stroke.points.length === 0) return;
    const next = [...annRef.current, stroke];
    annRef.current = next;
    setDocAnnotations(doc.id, next);
  };

  const undo = () => {
    const current = annRef.current;
    if (current.length === 0) return;
    const next = current.slice(0, -1);
    annRef.current = next;
    setDocAnnotations(doc.id, next);
  };

  const clearAll = () => {
    annRef.current = [];
    setDocAnnotations(doc.id, []);
    setConfirmClear(false);
  };

  const kindIcon = doc.kind === 'pdf' ? '📄' : '🖼️';
  const countLabel =
    annotations.length === 0 ? t('documents.noScribbles') : t('documents.strokes', { n: annotations.length });

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="card pad">
        <div className="row wrap" style={{ gap: 10 }}>
          <button type="button" className="btn btn-sm btn-soft" onClick={onBack}>
            <span aria-hidden="true">🚪</span> {t('documents.back')}
          </button>
          <strong className="doc-title" title={doc.name}>
            <span aria-hidden="true">{kindIcon}</span> {doc.name}
          </strong>
          <span className="tag">{doc.kind === 'pdf' ? t('documents.kindPdf') : t('documents.kindImage')}</span>
          {doc.kind === 'pdf' && (
            <span className="tag">
              <span aria-hidden="true">📌</span> {t('documents.pdfHint')}
            </span>
          )}
          <span className="spacer" />
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'nav', label: t('documents.modeNav') },
              { value: 'draw', label: t('documents.modeDraw') },
            ]}
          />
          <button
            type="button"
            className="btn btn-sm"
            onClick={undo}
            disabled={annotations.length === 0}
            title={t('documents.undo')}
            aria-label={t('documents.undo')}
          >
            <span aria-hidden="true">↶</span> {t('documents.undo')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => setConfirmClear(true)}
            disabled={annotations.length === 0}
            title={t('documents.clear')}
            aria-label={t('documents.clear')}
          >
            <span aria-hidden="true">🗑</span> {t('documents.clear')}
          </button>
        </div>

        {mode === 'draw' && (
          <div className="row wrap doc-tools">
            <span className="small muted bold">{t('documents.ink')}</span>
            {TOOLS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`doc-tool ${tool === item.id ? 'active' : ''}`}
                onClick={() => setTool(item.id)}
                title={t(item.key)}
                aria-label={t(item.key)}
                aria-pressed={tool === item.id}
              >
                {item.emoji}
              </button>
            ))}
            <span className="doc-sep" />
            {INK_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`doc-color ${color === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                title={c}
                aria-label={c}
                aria-pressed={color === c}
              />
            ))}
            <span className="doc-sep" />
            <span className="small muted bold">{t('documents.size')}</span>
            <input
              className="doc-size"
              type="range"
              min={2}
              max={24}
              step={1}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              aria-label={t('documents.size')}
            />
            <span className="small muted bold">{size}px</span>
          </div>
        )}
      </div>

      <div className="doc-stage" ref={stageRef}>
        <div className="doc-canvas-wrap" ref={wrapRef} onScroll={handleScroll}>
          {doc.kind === 'image' ? (
            <img
              className="doc-img"
              src={doc.dataUrl}
              alt={doc.name}
              draggable={false}
              onLoad={measure}
              onError={measure}
            />
          ) : (
            <iframe className="doc-frame" src={doc.dataUrl} title={doc.name} />
          )}
        </div>
        <canvas
          ref={baseRef}
          className={`doc-overlay doc-base ${mode === 'nav' ? 'is-nav' : ''}`}
          aria-hidden="true"
        />
        <canvas
          ref={liveRef}
          className={`doc-overlay doc-live ${mode === 'nav' ? 'is-nav' : ''}`}
          role="img"
          aria-label="annotation drawing surface"
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
          onLostPointerCapture={handleUp}
        />
      </div>

      <div className="row wrap" style={{ gap: 8 }}>
        <span className="tag">
          <span aria-hidden="true">🎨</span> {countLabel}
        </span>
        <span className="small muted" role="status">
          {mode === 'draw' ? t('documents.drawHint') : t('documents.navHint')}
        </span>
      </div>

      <MascotDock mood="study" message={t('documents.dock')} size={76} />

      <Modal
        open={confirmClear}
        title={t('documents.clearTitle')}
        onClose={() => setConfirmClear(false)}
        actions={
          <>
            <button type="button" className="btn btn-soft" onClick={() => setConfirmClear(false)}>
              {t('documents.keep')}
            </button>
            <button type="button" className="btn btn-danger" onClick={clearAll}>
              {t('documents.clearYes')}
            </button>
          </>
        }
      >
        <p style={{ margin: 0, fontWeight: 700 }}>{t('documents.clearMsg')}</p>
      </Modal>
    </div>
  );
}

export default function DocumentsView() {
  const t: TFn = useT();
  const docs = useApp((s) => s.docs);
  const notes = useApp((s) => s.notes);
  const addDoc = useApp((s) => s.addDoc);
  const deleteDoc = useApp((s) => s.deleteDoc);

  const [openId, setOpenId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [docName, setDocName] = useState('');
  const [noteLink, setNoteLink] = useState('');
  const [importErr, setImportErr] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openDoc = docs.find((d) => d.id === openId) ?? null;
  const deleteTarget = docs.find((d) => d.id === deleteId) ?? null;
  const sortedNotes = useMemo(() => [...notes].sort((a, b) => a.title.localeCompare(b.title)), [notes]);

  const openImport = () => {
    setPending(null);
    setDocName('');
    setNoteLink('');
    setImportErr(null);
    setImportOpen(true);
  };

  const closeImport = () => {
    setImportOpen(false);
    setPending(null);
    setDocName('');
    setNoteLink('');
    setImportErr(null);
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    setPending(null);
    setImportErr(null);
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) {
      setImportErr(t('documents.errUnsupported'));
      return;
    }
    if (file.size > MAX_BYTES) {
      setImportErr(t('documents.errTooBig'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => {
      setPending(null);
      setImportErr(t('documents.errRead'));
    };
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        setImportErr(t('documents.errRead'));
        return;
      }
      setPending({
        name: file.name,
        dataUrl,
        kind: isPdf ? 'pdf' : 'image',
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
      });
      setDocName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const commitImport = () => {
    if (!pending) return;
    const id = addDoc({
      name: docName.trim() || pending.name,
      kind: pending.kind,
      dataUrl: pending.dataUrl,
      noteId: noteLink || null,
      annotations: [],
    });
    closeImport();
    setOpenId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteDoc(deleteId);
      if (openId === deleteId) setOpenId(null);
    }
    setDeleteId(null);
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head">
        <div>
          <div className="page-title" role="heading" aria-level={1}>{t('documents.title')}</div>
          <div className="page-sub">{t('documents.sub')}</div>
        </div>
        <span className="spacer" />
        {!openDoc && (
          <button type="button" className="btn btn-primary" onClick={openImport}>
            <span aria-hidden="true">＋</span> {t('documents.import')}
          </button>
        )}
      </div>

      {openDoc ? (
        <DocViewer key={openDoc.id} doc={openDoc} onBack={() => setOpenId(null)} />
      ) : (
        <>
          {docs.length === 0 ? (
            <EmptyState
              emoji="📎"
              title={t('documents.emptyTitle')}
              hint={t('documents.emptyHint')}
              action={
                <button type="button" className="btn btn-primary" onClick={openImport}>
                  <span aria-hidden="true">＋</span> {t('documents.import')}
                </button>
              }
            />
          ) : (
            <div className="grid">
              {docs.map((doc) => {
                const note = doc.noteId ? notes.find((n) => n.id === doc.noteId) ?? null : null;
                return (
                  <div className="card pad stack" key={doc.id} style={{ gap: 8 }}>
                    <div className="row between" style={{ gap: 8 }}>
                      <span className="doc-emoji" aria-hidden="true">
                        {doc.kind === 'pdf' ? '📄' : '🖼️'}
                      </span>
                      <div className="row wrap" style={{ gap: 6 }}>
                        <span className="tag">{doc.kind === 'pdf' ? t('documents.kindPdf') : t('documents.kindImage')}</span>
                        <span className="pill small">{t('documents.strokes', { n: doc.annotations.length })}</span>
                      </div>
                    </div>
                    <div className="bold doc-name" title={doc.name}>
                      {doc.name}
                    </div>
                    {note && (
                      <button
                        type="button"
                        className="pill small doc-note-link"
                        title={t('documents.linked')}
                        onClick={() => {
                          window.location.hash = '/notes';
                        }}
                      >
                        <span aria-hidden="true">📝</span> {note.title || t('documents.untitled')}
                      </button>
                    )}
                    <div className="row" style={{ gap: 8 }}>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpenId(doc.id)}>
                        <span aria-hidden="true">📂</span> {t('documents.open')}
                      </button>
                      <span className="spacer" />
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleteId(doc.id)}>
                        <span aria-hidden="true">🗑</span> {t('documents.delete')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <MascotDock mood="idle" message={t('documents.listDock')} size={76} />
        </>
      )}

      <Modal
        open={importOpen}
        title={t('documents.importTitle')}
        onClose={closeImport}
        actions={
          <>
            <button type="button" className="btn btn-soft" onClick={closeImport}>
              {t('documents.cancel')}
            </button>
            <button type="button" className="btn btn-primary" onClick={commitImport} disabled={!pending}>
              {t('documents.add')}
            </button>
          </>
        }
      >
        <div className="stack" style={{ gap: 12 }}>
          <div className="row wrap" style={{ gap: 10 }}>
            <label className="btn btn-sm btn-soft">
              <span aria-hidden="true">📁</span> {t('documents.choose')}
              <input type="file" accept=".pdf,image/*" onChange={onFile} hidden />
            </label>
            <span className="small muted">{t('documents.fileHint')}</span>
          </div>
          {pending && (
            <div className="pill small">
              <span aria-hidden="true">📎</span> {t('documents.fileReady', { name: pending.name, size: pending.sizeKb })}
            </div>
          )}
          <label className="stack" style={{ gap: 4 }}>
            <span className="small bold">{t('documents.name')}</span>
            <input
              className="input"
              value={docName}
              placeholder={t('documents.namePlaceholder')}
              onChange={(e) => setDocName(e.target.value)}
            />
          </label>
          <label className="stack" style={{ gap: 4 }}>
            <span className="small bold">{t('documents.linkNote')}</span>
            <select className="select" value={noteLink} onChange={(e) => setNoteLink(e.target.value)}>
              <option value="">{t('documents.noNote')}</option>
              {sortedNotes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title || t('documents.untitled')}
                </option>
              ))}
            </select>
          </label>
          {importErr && (
            <div className="doc-err" role="status">
              <span aria-hidden="true">⚠️</span> {importErr}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={deleteId !== null}
        title={t('documents.deleteTitle')}
        onClose={() => setDeleteId(null)}
        actions={
          <>
            <button type="button" className="btn btn-soft" onClick={() => setDeleteId(null)}>
              {t('documents.keep')}
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete}>
              {t('documents.deleteYes')}
            </button>
          </>
        }
      >
        <p style={{ margin: 0, fontWeight: 700 }}>{t('documents.deleteMsg', { name: deleteTarget?.name ?? '' })}</p>
      </Modal>
    </div>
  );
}
