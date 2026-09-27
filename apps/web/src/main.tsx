import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@cutepad/ui/styles.css';
import './styles.css';
import App from './App';
import { startAutoSync } from '@cutepad/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

startAutoSync();

if (Capacitor.isNativePlatform()) {
  // Keep the system status bar visible: pink bar, dark icons, app content below it.
  void StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  void StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  void StatusBar.setBackgroundColor({ color: '#ffd6e8' }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
