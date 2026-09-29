import { useApp } from './store';
import type { AuthUser } from './cloud';

const usernameKey = (email: string): string => `cutepad-username-${email.trim().toLowerCase()}`;

/**
 * Per-device fallback for the account's @username, keyed by email so it never leaks across
 * accounts and survives the logout device-wipe even when cloud sync consent is off.
 */
function readStoredUsername(email: string): string | undefined {
  try {
    return localStorage.getItem(usernameKey(email)) || undefined;
  } catch {
    return undefined;
  }
}

function writeStoredUsername(email: string, username?: string): void {
  try {
    const key = usernameKey(email);
    if (username) localStorage.setItem(key, username);
    else localStorage.removeItem(key);
  } catch {
    /* storage unavailable — the in-memory copy still works */
  }
}

/** display fallback when the account has no custom @username */
export function defaultUsername(email: string): string {
  return email.split('@')[0].toLowerCase() || 'friend';
}

/**
 * Write a signed-in Firebase identity into the store, carrying the account's @username along:
 * the live store copy wins (freshly restored backup), then the per-email local fallback.
 * `username` sets it (null/'' clears back to the default handle) — omit to keep the current one.
 */
export function applyAuthUser(user: AuthUser, username?: string | null): void {
  const s = useApp.getState();
  const prev = s.auth.user;
  const keep =
    prev && prev.email === user.email && prev.username ? prev.username : readStoredUsername(user.email);
  const next = username === undefined ? keep : username?.trim() || undefined;
  writeStoredUsername(user.email, next);
  s.setAuth({ isLoggedIn: true, user: next ? { ...user, username: next } : user });
}
