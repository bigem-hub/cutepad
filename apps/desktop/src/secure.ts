import { ipcMain, safeStorage } from 'electron';

/**
 * Synchronous AI-key encryption at rest via the OS keychain (safeStorage).
 * Renderer (preload.secureSync) calls this with sendSync('secure-string', op, value).
 */
export function registerSecureStringHandler(): void {
  ipcMain.on('secure-string', (event, op: 'encrypt' | 'decrypt', value: string) => {
    try {
      if (typeof value !== 'string' || !safeStorage.isEncryptionAvailable()) {
        event.returnValue = null;
        return;
      }
      if (op === 'encrypt') {
        event.returnValue = `enc:v1:${safeStorage.encryptString(value).toString('base64')}`;
      } else if (value.startsWith('enc:v1:')) {
        event.returnValue = safeStorage.decryptString(Buffer.from(value.slice(7), 'base64'));
      } else {
        event.returnValue = value;
      }
    } catch {
      event.returnValue = null;
    }
  });
}
