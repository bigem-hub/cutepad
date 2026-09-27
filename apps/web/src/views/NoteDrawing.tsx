import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { PALETTE, useApp } from '@cutepad/core';
import { Ic, Modal, type IconName } from '@cutepad/ui';

type Tool = 'pen' | 'marker' | 'glitter' | 'rainbow' | 'eraser';
type SizeId = 'S' | 'M' | 'L';

interface Point {
  x: number;
  y: number;
  p: number;
}

export interface Stroke {
  tool: Tool;
  color: string;
  size: number;
  points: Point[];
}

const TOOLS: { id: Tool; icon: IconName; label: string }[] = [
  { id: 'pen', icon: 'pencil', label: 'Pen' },
  { id: 'marker', icon: 'pen', label: 'Marker' },
  { id: 'glitter', icon: 'sparkles', label: 'Glitter pen' },
  { id: 'rainbow', icon: 'rainbow', label: 'Rainbow pen' },
  { id: 'eraser', icon: 'eraser', label: 'Eraser' },
];

const SIZES: { id: SizeId; px: number }[] = [
  { id: 'S', px: 2.5 },
  { id: 'M', px: 4.5 },
  { id: 'L', px: 8 },
];

const INK_COLORS = ['#1c1626', '#ffffff', ...PALETTE];

function widthFactor(p: number): number {
  return 0.35 + p * 1.3;
}

function rnd(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function sparkles(ctx: CanvasRenderingContext2D, stroke: Stroke, at: Point, i: number): void {
  for (let k = 0; k < 3; k += 1) {
    const seed = i * 7.3 + k * 3.1;
    const ang = rnd(seed) * Math.PI * 2;
    const dist = 4 + rnd(seed + 1) * 13;
    const r = 1 + rnd(seed + 2) * 2.2;
    ctx.globalAlpha = 0.45 + rnd(seed + 3) * 0.55;
    ctx.fillStyle = rnd(seed + 4) > 0.78 ? '#ffd76e' : stroke.color;
    ctx.beginPath();
    ctx.arc(at.x + Math.cos(ang) * dist, at.y + Math.sin(ang) * dist, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintDot(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  const at = stroke.points[0];
  if (!at) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.beginPath();
    ctx.arc(at.x, at.y, stroke.size * 1.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (stroke.tool === 'marker') {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = stroke.color;
    ctx.beginPath();
    ctx.arc(at.x, at.y, stroke.size * 1.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (stroke.tool === 'rainbow') {
    ctx.fillStyle = `hsl(${Number(stroke.color) % 360} 90% 62%)`;
    ctx.beginPath();
    ctx.arc(at.x, at.y, stroke.size * 0.5 * widthFactor(at.p), 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = stroke.color;
    ctx.beginPath();
    ctx.arc(at.x, at.y, stroke.size * 0.5 * widthFactor(at.p), 0, Math.PI * 2);
    ctx.fill();
  }
  if (stroke.tool === 'glitter') sparkles(ctx, stroke, at, 0);
  ctx.restore();
}

function paintSegment(ctx: CanvasRenderingContext2D, stroke: Stroke, i: number): void {
  const a = stroke.points[i - 1];
  const b = stroke.points[i];
  if (!a || !b) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = stroke.size * 2.4;
  } else if (stroke.tool === 'marker') {
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size * 2.4;
  } else if (stroke.tool === 'rainbow') {
    ctx.strokeStyle = `hsl(${(Number(stroke.color) + i * 14) % 360} 90% 62%)`;
    ctx.lineWidth = stroke.size * widthFactor(b.p);
  } else {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size * widthFactor(b.p);
  }
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  if (stroke.tool === 'glitter') sparkles(ctx, stroke, b, i);
  ctx.restore();
}

function paintStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  if (stroke.points.length === 1) {
    paintDot(ctx, stroke);
    return;
  }
  for (let i = 1; i < stroke.points.length; i += 1) paintSegment(ctx, stroke, i);
}

export interface NoteDrawingProps {
  noteId: string;
  drawing: string | null;
}

export default function NoteDrawing({ noteId, drawing }: NoteDrawingProps) {
  const updateNote = useApp((s) => s.updateNote);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<HTMLImageElement | null>(null);
  const liveRef = useRef<Stroke | null>(null);
  const loadedNoteRef = useRef<string | null>(null);
  const savedUrlRef = useRef<string | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(INK_COLORS[0]);
  const [sizeId, setSizeId] = useState<SizeId>('M');
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [bgVersion, setBgVersion] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);

  const baseSize = SIZES.find((s) => s.id === sizeId)?.px ?? 4.5;

  useEffect(() => {
    const ownSave = loadedNoteRef.current === noteId && drawing !== null && drawing === savedUrlRef.current;
    if (ownSave) return;
    loadedNoteRef.current = noteId;
    savedUrlRef.current = null;
    setStrokes([]);
    liveRef.current = null;
    bgRef.current = null;
    setBgVersion((v) => v + 1);
    if (!drawing) return;
    const img = new Image();
    img.onload = () => {
      bgRef.current = img;
      setBgVersion((v) => v + 1);
    };
    img.onerror = () => {
      bgRef.current = null;
      setBgVersion((v) => v + 1);
    };
    img.src = drawing;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [noteId, drawing]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setStage((prev) =>
        Math.abs(prev.w - rect.width) < 1 && Math.abs(prev.h - rect.height) < 1
          ? prev
          : { w: rect.width, h: rect.height },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || stage.w < 2 || stage.h < 2) return;
    const width = Math.max(1, Math.round(stage.w));
    const height = Math.max(1, Math.round(stage.h));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    const bg = bgRef.current;
    if (bg && bg.complete && bg.naturalWidth > 0) {
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    }
    for (const stroke of strokes) paintStroke(ctx, stroke);
  }, [stage, strokes, bgVersion]);

  const toPoint = (e: RPointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
    const p = e.pointerType === 'pen' ? Math.min(1, Math.max(0, e.pressure || 0.5)) : 0.5;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, p };
  };

  const handleDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const stroke: Stroke = {
      tool,
      color: tool === 'rainbow' ? String(Date.now() % 100000) : color,
      size: baseSize,
      points: [toPoint(e)],
    };
    liveRef.current = stroke;
    const ctx = canvas.getContext('2d');
    if (ctx) paintDot(ctx, stroke);
  };

  const handleMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    const stroke = liveRef.current;
    if (!stroke) return;
    const next = toPoint(e);
    const last = stroke.points[stroke.points.length - 1];
    if (!last) return;
    const dx = next.x - last.x;
    const dy = next.y - last.y;
    if (dx * dx + dy * dy < 1.7) return;
    stroke.points.push(next);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) paintSegment(ctx, stroke, stroke.points.length - 1);
  };

  const endStroke = () => {
    const stroke = liveRef.current;
    liveRef.current = null;
    if (!stroke) return;
    setStrokes((prev) => [...prev, stroke]);
  };

  const undo = useCallback(() => setStrokes((prev) => prev.slice(0, -1)), []);

  const clearAll = () => {
    setStrokes([]);
    liveRef.current = null;
    setConfirmClear(false);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    savedUrlRef.current = url;
    updateNote(noteId, { drawing: url });
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'cutepad-doodle.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const removeDoodle = () => {
    updateNote(noteId, { drawing: null });
    setStrokes([]);
    liveRef.current = null;
    bgRef.current = null;
    setBgVersion((v) => v + 1);
  };

  return (
    <div className="doodle">
      <div className="row wrap doodle-tools">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tool-btn ${tool === t.id ? 'active' : ''}`}
            onClick={() => setTool(t.id)}
            title={t.label}
            aria-label={t.label}
            aria-pressed={tool === t.id}
          >
            <Ic name={t.icon} size={16} />
          </button>
        ))}
        <span className="doodle-sep" />
        {SIZES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`tool-btn ${sizeId === s.id ? 'active' : ''}`}
            onClick={() => setSizeId(s.id)}
            title={`Size ${s.id}`}
            aria-label={`Size ${s.id}`}
            aria-pressed={sizeId === s.id}
          >
            {s.id}
          </button>
        ))}
        <span className="spacer" />
        <button type="button" className="btn btn-sm" onClick={undo} disabled={strokes.length === 0} title="Undo last stroke" aria-label="Undo last stroke">
          ↩ undo
        </button>
        <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirmClear(true)} title="Clear the whole doodle" aria-label="Clear the whole doodle">
          <Ic name="trash" size={14} /> clear
        </button>
      </div>

      <div className="row wrap doodle-tools">
        <span className="small muted bold">ink</span>
        {INK_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`color-pick ${color === c ? 'active' : ''}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
            title={c === '#1c1626' ? 'black ink' : c === '#ffffff' ? 'white ink' : `ink ${c}`}
            aria-label={c === '#1c1626' ? 'black ink' : c === '#ffffff' ? 'white ink' : `ink ${c}`}
            aria-pressed={color === c}
          />
        ))}
      </div>

      <div className="doodle-stage" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="doodle-canvas"
          role="img"
          aria-label="Note drawing canvas — draw with mouse, pen or touch"
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onLostPointerCapture={endStroke}
        />
      </div>

      <div className="row wrap">
        <button type="button" className="btn btn-primary btn-sm" onClick={save} title="Save doodle to this note" aria-label="Save doodle to this note">
          <Ic name="save" size={14} /> save doodle
        </button>
        <button type="button" className="btn btn-sm" onClick={download} title="Download doodle as PNG" aria-label="Download doodle as PNG">
          <Ic name="download" size={14} /> download png
        </button>
        {drawing && (
          <button type="button" className="btn btn-sm btn-danger" onClick={removeDoodle} title="Remove saved doodle" aria-label="Remove saved doodle">
            ✕ remove doodle
          </button>
        )}
        <span className="spacer" />
        {drawing && (
          <span className="tag">
            <Ic name="palette" size={15} className="inline-icon" /> doodle attached
          </span>
        )}
      </div>

      <p className="doodle-hint">
        <Ic name="pencil" size={15} className="inline-icon" /> doodles only stick to your note when you press <b>save</b> — saving auto-saves the whole note to your notebook right away.
        {strokes.length > 0 && ' unsaved strokes live only on the canvas until then.'}
      </p>

      <Modal
        open={confirmClear}
        title="Clear this doodle?"
        onClose={() => setConfirmClear(false)}
        actions={
          <>
            <button type="button" className="btn btn-soft" onClick={() => setConfirmClear(false)}>
              keep it
            </button>
            <button type="button" className="btn btn-danger" onClick={clearAll}>
              clear doodle
            </button>
          </>
        }
      >
        <p style={{ margin: 0, fontWeight: 700 }}>
          every stroke on the canvas will vanish 🥺 the version saved on your note stays untouched until you press save.
        </p>
      </Modal>
    </div>
  );
}
