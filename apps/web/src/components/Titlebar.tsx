import { getBridge } from '@cutepad/core';

export default function Titlebar() {
  const bridge = getBridge();
  if (!bridge) return null;
  return (
    <div className="titlebar">
      <span><span aria-hidden="true">🌸 </span>Cutepad</span>
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
