import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('cutepad', {
  isDesktop: true,
  platform: process.platform,
  appVersion: '0.1.0',
  notify: (title: string, body: string) => ipcRenderer.send('notify', { title, body }),
  openSticky: (id: string) => ipcRenderer.send('open-sticky', id),
  closeWindow: () => ipcRenderer.send('close-this-window'),
  setTitleBarAction: (action: 'minimize' | 'maximize' | 'close') =>
    ipcRenderer.send('titlebar-action', action),
  onMaximizeChange: (callback: (maximized: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, maximized: boolean) => callback(maximized);
    ipcRenderer.on('maximize-change', listener);
    return () => ipcRenderer.removeListener('maximize-change', listener);
  },
  exportPdf: (html: string, suggestedName: string) =>
    ipcRenderer.invoke('export-pdf', { html, suggestedName }),
  saveBackup: (json: string, suggestedName?: string) =>
    ipcRenderer.invoke('save-backup', { json, suggestedName }),
  guardSetActive: (active: boolean, blocked: { apps: string[]; sites: string[] }) =>
    ipcRenderer.send('guard-set-active', { active, blocked }),
  onGuardForeground: (callback: (info: { process: string; title: string; at: number }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, info: { process: string; title: string; at: number }) =>
      callback(info);
    ipcRenderer.on('guard-foreground', listener);
    return () => ipcRenderer.removeListener('guard-foreground', listener);
  },
  guardNudge: () => ipcRenderer.send('guard-nudge'),
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
});
