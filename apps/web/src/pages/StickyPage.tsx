import { getBridge, useApp } from '@cutepad/core';
import { Ic } from '@cutepad/ui';

const CYCLE = ['#fff3a8', '#ffd6e8', '#d9f7e6', '#d6e6ff', '#ecd9ff', '#ffe0cc'];

export default function StickyPage({ id }: { id: string }) {
  const sticky = useApp((s) => s.stickies.find((x) => x.id === id));
  const updateSticky = useApp((s) => s.updateSticky);
  const deleteSticky = useApp((s) => s.deleteSticky);
  const addSticky = useApp((s) => s.addSticky);
  const bridge = getBridge();

  if (!sticky) {
    return (
      <div className="page center" style={{ paddingTop: 60 }}>
        <div className="empty">
          <span className="emoji" aria-hidden="true"><Ic name="sparkle" size={32} /></span>
          <h3>this sticky floated away</h3>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const newId = addSticky({ text: '' });
              if (bridge) bridge.openSticky(newId);
            }}
          >
            make a new one
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: sticky.color }}>
      <div className="titlebar" style={{ background: 'rgba(255,255,255,0.35)', color: '#6b5a4a' }}>
        <span><Ic name="pin" size={15} className="inline-icon" /> sticky</span>
        <span className="spacer" />
        <button
          type="button"
          aria-label="Change color"
          onClick={() => {
            const idx = CYCLE.indexOf(sticky.color);
            updateSticky(sticky.id, { color: CYCLE[(idx + 1) % CYCLE.length] });
          }}
          style={{ color: '#6b5a4a' }}
        >
          <Ic name="palette" size={16} />
        </button>
        <button type="button" aria-label="Close" className="close" onClick={() => bridge?.closeWindow()} style={{ color: '#6b5a4a' }}>
          ✕
        </button>
      </div>
      <textarea
        value={sticky.text}
        autoFocus
        placeholder="type something cute… ✏️"
        aria-label="Sticky note text"
        onChange={(e) => updateSticky(sticky.id, { text: e.target.value })}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          resize: 'none',
          background: 'transparent',
          padding: '18px 20px',
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          fontSize: 17,
          lineHeight: 1.55,
          color: '#5a4a3a',
        }}
      />
      <div style={{ padding: 10, display: 'flex', justifyContent: 'center', gap: 8 }}>
        {CYCLE.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => updateSticky(sticky.id, { color })}
            aria-label={`Color ${color}`}
            aria-pressed={sticky.color === color}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: sticky.color === color ? '3px solid #6b5a4a' : '2px solid rgba(0,0,0,0.15)',
              background: color,
              cursor: 'pointer',
            }}
          />
        ))}
        <button
          type="button"
          className="btn btn-sm btn-danger"
          style={{ marginLeft: 10 }}
          onClick={() => {
            deleteSticky(sticky.id);
            bridge?.closeWindow();
          }}
        >
          delete
        </button>
      </div>
    </div>
  );
}
