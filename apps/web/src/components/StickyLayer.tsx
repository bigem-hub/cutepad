import { useEffect, useRef, useState } from 'react';
import { getBridge, useApp, type Sticky } from '@cutepad/core';
import { Ic } from '@cutepad/ui';

const CYCLE = ['#fff3a8', '#ffd6e8', '#d9f7e6', '#d6e6ff', '#ecd9ff', '#ffe0cc'];

function StickyWidget({ sticky }: { sticky: Sticky }) {
  const updateSticky = useApp((s) => s.updateSticky);
  const deleteSticky = useApp((s) => s.deleteSticky);
  const [pos, setPos] = useState({ x: sticky.x, y: sticky.y });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    setPos({ x: sticky.x, y: sticky.y });
  }, [sticky.x, sticky.y]);

  const clamp = (x: number, y: number) => ({
    x: Math.max(4, Math.min(window.innerWidth - sticky.w - 4, x)),
    y: Math.max(4, Math.min(window.innerHeight - 60, y)),
  });

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'BUTTON') return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    updateSticky(sticky.id, { z: Date.now() % 100000 });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const next = clamp(e.clientX - dragRef.current.dx, e.clientY - dragRef.current.dy);
    setPos(next);
  };

  const onPointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    updateSticky(sticky.id, { x: pos.x, y: pos.y });
  };

  const bridge = getBridge();
  const dark = useApp((s) => s.settings.dark);

  return (
    <div
      className={`sticky-widget ${dark ? 'dark' : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: sticky.w,
        height: sticky.h,
        background: sticky.color,
        zIndex: 70 + (sticky.z % 30),
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="group"
      aria-label="Sticky note"
    >
      <span className="sticky-tape" aria-hidden="true" />
      <div className="sticky-bar">
        <span aria-hidden="true" style={{ fontSize: 11, fontWeight: 800, opacity: 0.55, cursor: 'grab' }}>⠿ sticky</span>
        <span className="spacer" />
        <button
          type="button"
          title="Change color"
          aria-label="Change color"
          onClick={() => {
            const idx = CYCLE.indexOf(sticky.color);
            updateSticky(sticky.id, { color: CYCLE[(idx + 1) % CYCLE.length] });
          }}
        >
          <Ic name="palette" size={16} />
        </button>
        {bridge && (
          <button type="button" title="Open in own window" aria-label="Open in own window" onClick={() => bridge.openSticky(sticky.id)}>
            <Ic name="move" size={16} />
          </button>
        )}
        <button type="button" title="Close" aria-label="Close" onClick={() => deleteSticky(sticky.id)}>
          ✕
        </button>
      </div>
      <textarea
        value={sticky.text}
        placeholder="type something cute… ✏️"
        aria-label="Sticky note text"
        onChange={(e) => updateSticky(sticky.id, { text: e.target.value })}
        onPointerDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export default function StickyLayer() {
  const stickies = useApp((s) => s.stickies);
  return (
    <>
      {stickies.map((sticky) => (
        <StickyWidget key={sticky.id} sticky={sticky} />
      ))}
    </>
  );
}
