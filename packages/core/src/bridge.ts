export interface GuardForeground {
  process: string;
  title: string;
  at: number;
}

export interface CutepadBridge {
  isDesktop: boolean;
  platform: string;
  appVersion: string;
  notify(title: string, body: string): void;
  openSticky(id: string): void;
  closeWindow(): void;
  setTitleBarAction(action: 'minimize' | 'maximize' | 'close'): void;
  onMaximizeChange(callback: (maximized: boolean) => void): () => void;
  exportPdf(html: string, suggestedName: string): Promise<string | null>;
  saveBackup(json: string, suggestedName?: string): Promise<string | null>;
  guardSetActive(active: boolean, blocked: { apps: string[]; sites: string[] }): void;
  onGuardForeground(callback: (info: GuardForeground) => void): () => void;
  guardNudge(): void;
  openExternal(url: string): void;
}

interface WindowWithBridge {
  cutepad?: CutepadBridge;
}

export function getBridge(): CutepadBridge | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as WindowWithBridge).cutepad ?? null;
}

export function isDesktop(): boolean {
  return getBridge()?.isDesktop === true;
}
