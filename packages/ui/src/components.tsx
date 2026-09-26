import { useEffect, useRef, useState, useId, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AMBIENT_TRACKS, moodDef, useApp } from '@cutepad/core';
import { Mascot, type MascotProps } from './Mascot';

const CONFETTI_COLORS = ['#ff9ec4', '#b8a6ff', '#8fe3c8', '#ffd76e', '#a8d4ff', '#ffb7d5', '#fff3a8'];

export function CelebrationLayer() {
  const events = useApp((s) => s.events);
  const removeEvent = useApp((s) => s.removeEvent);
  const seen = useRef<Set<string>>(new Set());
  const [bursts, setBursts] = useState<{ id: string; seed: number }[]>([]);
  const [toast, setToast] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    for (const event of events) {
      if (seen.current.has(event.id)) continue;
      seen.current.add(event.id);
      const id = event.id;
      setBursts((current) => [...current, { id, seed: Math.random() }]);
      if (event.message) setToast({ id, text: event.message });
      window.setTimeout(() => {
        removeEvent(id);
        setBursts((current) => current.filter((b) => b.id !== id));
        setToast((current) => (current?.id === id ? null : current));
      }, 2300);
    }
  }, [events, removeEvent]);

  return (
    <>
      {bursts.map((burst) => (
        <div className="celebrate-layer" key={burst.id}>
          {Array.from({ length: 42 }, (_, i) => {
            const rand = pseudo(burst.seed, i);
            const rand2 = pseudo(burst.seed + 0.31, i * 1.7);
            const rand3 = pseudo(burst.seed + 0.77, i * 2.3);
            return (
              <span
                key={i}
                className="confetti-piece"
                style={{
                  left: `${rand * 100}%`,
                  background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                  animationDelay: `${rand2 * 0.5}s`,
                  animationDuration: `${1.4 + rand3 * 1.1}s`,
                  borderRadius: i % 3 === 0 ? '50%' : '3px',
                  width: i % 4 === 0 ? 9 : 12,
                }}
              />
            );
          })}
        </div>
      ))}
      {toast && (
        <div className="toast" role="status">
          <span>✨</span> {toast.text}
        </div>
      )}
    </>
  );
}

function pseudo(seed: number, n: number): number {
  const x = Math.sin(seed * 99991 + n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  wide?: boolean;
}

export function Modal({ open, title, onClose, children, actions, wide }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-head">
          <div className="modal-title" id={titleId}>
            {title}
          </div>
          <button className="btn btn-icon btn-soft" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      className="switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <i />
    </button>
  );
}

export function ProgressBar({ pct, tiny, solid }: { pct: number; tiny?: boolean; solid?: boolean }) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div className={`progress ${tiny ? 'tiny' : ''} ${solid ? 'solid' : ''}`} role="progressbar" aria-valuenow={Math.round(width)}>
      <i style={{ width: `${width}%` }} />
    </div>
  );
}

export function RingProgress({
  pct,
  size = 230,
  stroke = 14,
  children,
  color,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  color?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, pct));
  const dash = (clamped / 100) * circumference;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          style={{ color: 'color-mix(in srgb, var(--accent) 16%, transparent)' }}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color ?? 'url(#ring-grad)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          style={{ transition: 'stroke-dasharray 0.5s linear' }}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          textAlign: 'center',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function PlantCompanion({ stage, pct, size = 150 }: { stage: number; pct: number; size?: number }) {
  const stemHeight = 14 + stage * 17;
  const potTop = 104;
  const stemTop = potTop - stemHeight;
  const flower = stage >= 4;
  return (
    <svg width={size} height={size} viewBox="0 0 140 150" role="img" aria-label={`Study plant, stage ${stage}`}>
      <ellipse cx="70" cy="142" rx="46" ry="7" fill="rgba(120,90,140,0.14)" />
      {stage === 0 ? (
        <>
          <ellipse cx="70" cy={potTop - 6} rx="10" ry="7" fill="#a9855e" />
          <path d="M66 88 q4 -8 8 0" stroke="#8fe3c8" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <g className="anim-breathe">
          <path
            d={`M70 ${potTop} C 68 ${potTop - stemHeight / 2} 72 ${potTop - stemHeight * 0.75} 70 ${stemTop}`}
            stroke="#7cc99a"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
          <ellipse cx={70 - 13} cy={potTop - stemHeight * 0.5} rx="13" ry="7" fill="#96e0b5" transform={`rotate(-24 ${70 - 13} ${potTop - stemHeight * 0.5})`} />
          <ellipse cx={70 + 13} cy={potTop - stemHeight * 0.72} rx="13" ry="7" fill="#96e0b5" transform={`rotate(24 ${70 + 13} ${potTop - stemHeight * 0.72})`} />
          {flower ? (
            <g className="anim-wiggle" style={{ transformOrigin: `70px ${stemTop - 4}px` }}>
              {[0, 72, 144, 216, 288].map((deg) => (
                <ellipse
                  key={deg}
                  cx="70"
                  cy={stemTop - 14}
                  rx="8"
                  ry="11"
                  fill={stage >= 5 ? '#ff9ec4' : '#ffc2da'}
                  transform={`rotate(${deg} 70 ${stemTop - 4})`}
                />
              ))}
              <circle cx="70" cy={stemTop - 4} r="7" fill="#ffd76e" />
            </g>
          ) : (
            <circle cx="70" cy={stemTop} r="6" fill="#b8f0d2" />
          )}
        </g>
      )}
      <path d="M44 104 L50 138 H90 L96 104 Z" fill="#ffb78f" stroke="#e8946a" strokeWidth="3" strokeLinejoin="round" />
      <rect x="40" y="98" width="60" height="13" rx="6" fill="#ffc9a8" stroke="#e8946a" strokeWidth="3" />
      <circle cx="62" cy="122" r="3" fill="#fff" opacity="0.7" />
      <circle cx="76" cy="130" r="2.4" fill="#fff" opacity="0.6" />
      <text x="108" y={Math.max(24, stemTop - 18)} fontSize="14" textAnchor="middle">
        {stage >= 4 ? '🌸' : stage > 0 ? '💧' : '🌱'}
      </text>
      <title>{`Your plant is growing! ${Math.round(pct)}% to next stage`}</title>
    </svg>
  );
}

export function EmptyState({
  emoji,
  title,
  hint,
  action,
}: {
  emoji: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="emoji">{emoji}</span>
      <h3>{title}</h3>
      {hint && <p className="small">{hint}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" role="group" aria-label="options">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={opt.value === value ? 'active' : ''}
          aria-pressed={opt.value === value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function MascotDock({ mood, message, size = 96 }: { mood: MascotProps['mood']; message?: string; size?: number }) {
  return (
    <div className="row" style={{ gap: 14, alignItems: 'flex-end' }}>
      <Mascot mood={mood} size={size} />
      {message && <div className="speech">{message}</div>}
    </div>
  );
}

export const STICKER_SETS: { name: string; items: string[] }[] = [
  { name: 'kawaii', items: ['🌸', '🍓', '🍰', '🍡', '🧸', '🐰', '🐱', '🦄', '🌈', '☁️', '💤', '💕'] },
  { name: 'study', items: ['📚', '✏️', '📐', '🧪', '🔬', '🎨', '🎵', '💡', '⏰', '📝', '🔍', '🎓'] },
  { name: 'nature', items: ['🌿', '🍀', '🌷', '🌻', '🍄', '🦋', '🐝', '🌊', '🌙', '⭐', '☄️', '🌞'] },
  { name: 'moods', items: ['😭', '🥺', '😤', '🥹', '😴', '🤗', '🫶', '✨', '🔥', '💖', '🍀', '🎉'] },
];

export function MoodFace({
  level,
  size = 44,
  selected,
  onClick,
  title,
}: {
  level: number;
  size?: number;
  selected?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  const def = moodDef(level);
  return (
    <button
      type="button"
      className={`mood-face ${selected ? 'selected' : ''}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.52), background: def.color }}
      onClick={onClick}
      title={title ?? def.name}
      aria-label={def.name}
      aria-pressed={selected}
    >
      {def.emoji}
    </button>
  );
}

export interface FlipCardProps {
  front: ReactNode;
  back: ReactNode;
  flipped: boolean;
  onFlip: () => void;
  minHeight?: number;
  label?: string;
}

export function FlipCard({ front, back, flipped, onFlip, minHeight = 220, label }: FlipCardProps) {
  return (
    <button
      type="button"
      className={`flip-card ${flipped ? 'flipped' : ''}`}
      style={{ minHeight }}
      onClick={onFlip}
      aria-label={label ?? (flipped ? 'Show front' : 'Show back')}
    >
      <span className="flip-inner">
        <span className="flip-face flip-front">{front}</span>
        <span className="flip-face flip-back">{back}</span>
      </span>
    </button>
  );
}

export interface TabDef {
  id: string;
  label: string;
  emoji?: string;
  badge?: string | number;
}

export function Tabs({ tabs, value, onChange }: { tabs: TabDef[]; value: string; onChange: (id: string) => void }) {
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === value);
    if (index < 0) return;
    let next = -1;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next >= 0) {
      e.preventDefault();
      onChange(tabs[next].id);
      const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons[next]?.focus();
    }
  };
  return (
    <div className="tabs" role="tablist" onKeyDown={onKeyDown}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === value}
          tabIndex={tab.id === value ? 0 : -1}
          className={tab.id === value ? 'active' : ''}
          onClick={() => onChange(tab.id)}
        >
          {tab.emoji && <span aria-hidden="true">{tab.emoji}</span>}
          {tab.label}
          {tab.badge !== undefined && <em className="tab-badge">{tab.badge}</em>}
        </button>
      ))}
    </div>
  );
}

export function AmbientPopover() {
  const track = useApp((s) => s.settings.ambient.track);
  const volume = useApp((s) => s.settings.ambient.volume);
  const setSettings = useApp((s) => s.setSettings);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  const currentEmoji = AMBIENT_TRACKS.find((t) => t.id === track)?.emoji ?? '🎧';
  return (
    <div className="ambient-pop" ref={ref}>
      <button
        type="button"
        className={`btn btn-icon ${track ? 'btn-soft ambient-on' : 'btn-soft'}`}
        title="Ambient sounds"
        aria-label="Ambient sounds"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">{track ? currentEmoji : '🎧'}</span>
      </button>
      {open && (
        <div className="ambient-menu card pad">
          <div className="small" style={{ fontWeight: 700, marginBottom: 6 }}>
            🎵 ambient sounds
          </div>
          <div className="ambient-grid">
            {AMBIENT_TRACKS.filter((t) => t.id !== 'none').map((t) => (
              <button
                key={t.id}
                type="button"
                className={`chip-btn ${track === t.id ? 'active' : ''}`}
                onClick={() => setSettings({ ambient: { track: track === t.id ? null : t.id } })}
              >
                {t.emoji} {t.name}
              </button>
            ))}
          </div>
          <label className="row" style={{ gap: 8, marginTop: 10, fontSize: 12, fontWeight: 600 }}>
            🔊
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setSettings({ ambient: { volume: Number(e.target.value) / 100 } })}
              style={{ flex: 1 }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
