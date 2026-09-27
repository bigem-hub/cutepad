import { getBridge } from '@cutepad/core';
import { Ic } from '@cutepad/ui';

export default function Titlebar() {
  const bridge = getBridge();
  if (!bridge) return null;
  return (
    <div className="titlebar">
      <span><Ic name="flower" size={15} className="inline-icon" /> Cutepad</span>
      <span className="spacer" />
      <button type="button" aria-label="Minimize" onClick={() => bridge.setTitleBarAction('minimize')}>
        ─
      </button>
      <button type="button" aria-label="Maximize" onClick={() => bridge.setTitleBarAction('maximize')}>
        ⬚
      </button>
      <button type="button" aria-label="Close" className="close" onClick={() => bridge.setTitleBarAction('close')}>
        ✕
      </button>
    </div>
  );
}
