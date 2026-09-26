import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  Notification,
  nativeImage,
  shell,
  Tray,
  type NativeImage,
} from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { makeKawaiiPng } from './icon';

const DEV_SERVER = process.env.CUTEPAD_DEV_SERVER ?? '';
const PRELOAD = path.join(__dirname, 'preload.js');
const RENDERER_INDEX = path.join(__dirname, 'renderer', 'index.html');

let mainWindow: BrowserWindow | null = null;
let tray: Electron.Tray | null = null;
let trayIcon: NativeImage | null = null;
let quitting = false;
let lastRotation = 0;

// ===== focus guard =====

let guardPoller: ChildProcess | null = null;
let guardSites: string[] = [];

function isBlockedUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return guardSites.some((s) => s && lower.includes(s.toLowerCase().replace(/^www\./, '')));
}

const GUARD_PS = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class CutepadFg {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
}
"@
$last = ""
while ($true) {
  try {
    $h = [CutepadFg]::GetForegroundWindow()
    $procId = 0
    [void][CutepadFg]::GetWindowThreadProcessId($h, [ref]$procId)
    $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
    $name = "unknown"; $title = ""
    if ($p) { $name = $p.ProcessName; try { $title = $p.MainWindowTitle } catch {} }
    $line = "$name" + [char]9 + "$title"
    if ($line -ne $last) { $last = $line; [Console]::Out.WriteLine($line) }
  } catch {}
  Start-Sleep -Milliseconds 1200
}
`.trim();

function startGuardPoller(): void {
  if (guardPoller || process.platform !== 'win32') return;
  try {
    guardPoller = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', GUARD_PS], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    let buffer = '';
    guardPoller.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf-8');
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const tab = line.indexOf('\t');
        const processName = tab >= 0 ? line.slice(0, tab) : line;
        const title = tab >= 0 ? line.slice(tab + 1) : '';
        if (!mainWindow || mainWindow.isDestroyed()) continue;
        mainWindow.webContents.send('guard-foreground', { process: processName, title, at: Date.now() });
      }
    });
    guardPoller.on('error', () => {
      guardPoller = null;
    });
    guardPoller.on('exit', () => {
      guardPoller = null;
    });
  } catch {
    guardPoller = null;
  }
}

function stopGuardPoller(): void {
  if (!guardPoller) return;
  try {
    guardPoller.kill();
  } catch {
    /* already gone */
  }
  guardPoller = null;
}

function loadRenderer(win: BrowserWindow, hash = ''): Promise<void> {
  if (DEV_SERVER) {
    return win.loadURL(`${DEV_SERVER}${hash}`);
  }
  return win.loadFile(RENDERER_INDEX, hash ? { hash } : undefined);
}

function showMainWindow(): void {
  if (!mainWindow) {
    void createMainWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1340,
    height: 880,
    minWidth: 940,
    minHeight: 620,
    frame: false,
    show: false,
    backgroundColor: '#f7f2ff',
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  void loadRenderer(mainWindow);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      if (isBlockedUrl(url)) {
        mainWindow?.webContents.send('guard-foreground', { process: 'browser', title: url, at: Date.now() });
      } else {
        void shell.openExternal(url);
      }
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isBlockedUrl(url)) event.preventDefault();
  });

  if (process.env.CUTEPAD_SMOKE) {
    mainWindow.webContents.on('console-message', (_event, level, message) => {
      if (level >= 2) console.log(`[renderer:${level}] ${message}`);
    });
    mainWindow.webContents.once('did-finish-load', () => {
      const routes = [
        '#/', '#/notes', '#/planner', '#/focus', '#/tasks', '#/flashcards', '#/mood',
        '#/documents', '#/smart', '#/analytics', '#/achievements', '#/buddy', '#/settings',
        '#/privacy', '#/terms', '#/cookies', '#/refunds',
      ];
      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      void (async () => {
        for (const route of routes) {
          await mainWindow?.webContents.executeJavaScript(
            `location.hash = ${JSON.stringify(route.slice(1))}; true`,
          );
          await wait(1400);
        }
        console.log('CUTEPAD_SMOKE_OK');
        quitting = true;
        app.quit();
      })();
    });
    mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
      console.log(`CUTEPAD_SMOKE_FAIL ${code} ${description}`);
      quitting = true;
      app.quit();
    });
  }

  const broadcast = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('maximize-change', mainWindow.isMaximized());
  };
  mainWindow.on('maximize', broadcast);
  mainWindow.on('unmaximize', broadcast);

  mainWindow.on('close', (event) => {
    if (quitting) return;
    event.preventDefault();
    mainWindow?.hide();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createStickyWindow(id: string): void {
  const win = new BrowserWindow({
    width: 300,
    height: 350,
    minWidth: 220,
    minHeight: 200,
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#fff3a8',
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  void loadRenderer(win, `sticky/${id}`);
}

function backupsDir(): string {
  const dir = path.join(app.getPath('userData'), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function rotateBackups(dir: string): void {
  const now = Date.now();
  if (now - lastRotation < 5 * 60_000) return;
  lastRotation = now;
  try {
    const stamped = path.join(dir, `cutepad-${new Date(now).toISOString().replace(/[:T]/g, '-').slice(0, 19)}.json`);
    const latest = path.join(dir, 'cutepad-latest.json');
    if (fs.existsSync(latest)) fs.copyFileSync(latest, stamped);
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith('cutepad-') && f !== 'cutepad-latest.json')
      .sort();
    while (files.length > 10) {
      const oldest = files.shift();
      if (oldest) fs.rmSync(path.join(dir, oldest), { force: true });
    }
  } catch {
    /* rotation is best-effort */
  }
}

function setupIpc(): void {
  ipcMain.on('titlebar-action', (event, action: 'minimize' | 'maximize' | 'close') => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (action === 'minimize') win.minimize();
    else if (action === 'maximize') win.isMaximized() ? win.unmaximize() : win.maximize();
    else win.close();
  });

  ipcMain.on('close-this-window', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.on('open-sticky', (_event, id: string) => {
    if (typeof id === 'string' && id) createStickyWindow(id);
  });

  ipcMain.on('notify', (_event, payload: { title: string; body: string }) => {
    if (!Notification.isSupported()) return;
    new Notification({
      title: String(payload?.title ?? 'Cutepad'),
      body: String(payload?.body ?? ''),
      icon: trayIcon ?? undefined,
    }).show();
  });

  ipcMain.on('guard-set-active', (_event, payload: { active: boolean; blocked: { apps: string[]; sites: string[] } }) => {
    guardSites = Array.isArray(payload?.blocked?.sites) ? payload.blocked.sites : [];
    if (payload?.active) startGuardPoller();
    else stopGuardPoller();
  });

  ipcMain.on('guard-nudge', () => showMainWindow());

  ipcMain.on('open-external', (_event, url: string) => {
    if (typeof url !== 'string') return;
    if (!/^https?:\/\//i.test(url)) return;
    if (isBlockedUrl(url)) {
      mainWindow?.webContents.send('guard-foreground', { process: 'browser', title: url, at: Date.now() });
      return;
    }
    void shell.openExternal(url);
  });

  ipcMain.handle('save-backup', (_event, payload: { json: string; suggestedName?: string }) => {
    try {
      const dir = backupsDir();
      const latest = path.join(dir, 'cutepad-latest.json');
      fs.writeFileSync(latest, payload.json, 'utf-8');
      rotateBackups(dir);
      if (payload.suggestedName) {
        const target = path.join(dir, payload.suggestedName);
        fs.writeFileSync(target, payload.json, 'utf-8');
        return target;
      }
      return latest;
    } catch {
      return null;
    }
  });

  ipcMain.handle('export-pdf', async (event, payload: { html: string; suggestedName: string }) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const tmp = path.join(os.tmpdir(), `cutepad-export-${Date.now()}.html`);
    const hidden = new BrowserWindow({ show: false, width: 900, height: 1300, webPreferences: { sandbox: true } });
    try {
      fs.writeFileSync(tmp, payload.html, 'utf-8');
      await hidden.loadFile(tmp);
      const pdf = await hidden.webContents.printToPDF({ printBackground: true, pageSize: 'A4' });
      const saveOptions = {
        defaultPath: payload.suggestedName || 'cutepad-note.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      };
      const { canceled, filePath } = owner
        ? await dialog.showSaveDialog(owner, saveOptions)
        : await dialog.showSaveDialog(saveOptions);
      if (canceled || !filePath) return null;
      fs.writeFileSync(filePath, pdf);
      return filePath;
    } catch {
      return null;
    } finally {
      if (!hidden.isDestroyed()) hidden.destroy();
      fs.rmSync(tmp, { force: true });
    }
  });
}

function setupTray(): void {
  trayIcon = nativeImage.createFromBuffer(makeKawaiiPng(32));
  const instance = new Tray(trayIcon);
  tray = instance;
  instance.setToolTip('Cutepad · kawaii study companion');
  instance.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Cutepad 🌸', click: showMainWindow },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]),
  );
  instance.on('click', showMainWindow);
}

function setupMenu(): void {
  if (DEV_SERVER) {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: 'View',
          submenu: [
            { role: 'reload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
          ],
        },
      ]),
    );
  } else {
    Menu.setApplicationMenu(null);
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.cutepad.app');
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }
  app.on('second-instance', showMainWindow);

  setupIpc();
  setupMenu();
  setupTray();
  void createMainWindow();

  app.on('activate', showMainWindow);
});

app.on('before-quit', () => {
  quitting = true;
  stopGuardPoller();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
