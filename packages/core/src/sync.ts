import { selectData, useApp } from './store';
import { normalizeData, normalizeSettings } from './defaults';
import { applyAuthUser } from './profile';
import type { CutepadData, Note, Settings, SyncStatus } from './types';

const DOC_TABLE = 'cutepad_docs';
const BUDDY_TABLE = 'cutepad_buddies';
const PUBLIC_TABLE = 'cutepad_public_notes';
const GROUP_TABLE = 'cutepad_group_presence';
const DOC_ID = 'primary';

export interface BuddyPresence {
  name: string;
  minutesToday: number;
  totalMinutes: number;
  streak: number;
  sessions: number;
  mood: string;
  at: number;
}

function headers(sync: Settings['sync']): Record<string, string> {
  return {
    apikey: sync.anonKey,
    Authorization: `Bearer ${sync.anonKey}`,
    'Content-Type': 'application/json',
  };
}

function restBase(sync: Settings['sync']): string {
  return sync.url.replace(/\/$/, '') + '/rest/v1';
}

export function syncConfigured(sync: Settings['sync']): boolean {
  if (sync.provider === 'firebase') return true;
  return sync.provider === 'supabase' && !!sync.url && !!sync.anonKey && !!sync.owner;
}

function entityTime(e: Record<string, unknown>): number {
  const candidates = [e.updatedAt, e.completedAt, e.endedAt, e.createdAt, e.at];
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return c;
  }
  return 0;
}

function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of remote) map.set(item.id, item);
  for (const item of local) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      continue;
    }
    const lt = entityTime(item as unknown as Record<string, unknown>);
    const rt = entityTime(existing as unknown as Record<string, unknown>);
    if (lt >= rt) map.set(item.id, item);
  }
  return [...map.values()];
}

export function mergeData(local: CutepadData, remote: CutepadData): CutepadData {
  const remoteNewer = (remote.updatedAt ?? 0) > (local.updatedAt ?? 0);
  const merged: CutepadData = {
    version: Math.max(local.version ?? 1, remote.version ?? 1),
    subjects: mergeById(local.subjects, remote.subjects),
    folders: mergeById(local.folders, remote.folders),
    notes: mergeById(local.notes, remote.notes),
    blocks: mergeById(local.blocks, remote.blocks),
    tasks: mergeById(local.tasks, remote.tasks),
    sessions: mergeById(local.sessions, remote.sessions),
    stickies: mergeById(local.stickies, remote.stickies),
    reminders: mergeById(local.reminders, remote.reminders),
    achievements: mergeById(local.achievements, remote.achievements),
    decks: mergeById(local.decks ?? [], remote.decks ?? []),
    flashcards: mergeById(local.flashcards ?? [], remote.flashcards ?? []),
    reviewLogs: mergeById(local.reviewLogs ?? [], remote.reviewLogs ?? []),
    moods: mergeById(local.moods ?? [], remote.moods ?? []),
    docs: mergeById(local.docs ?? [], remote.docs ?? []),
    unlockedStickers: [...new Set([...(local.unlockedStickers ?? []), ...(remote.unlockedStickers ?? [])])],
    unlockedOutfits: [...new Set([...(local.unlockedOutfits ?? []), ...(remote.unlockedOutfits ?? [])])],
    settings: normalizeSettings(remoteNewer ? remote.settings : local.settings),
    buddy: { ...(remoteNewer ? remote.buddy : local.buddy), groupCode: (remoteNewer ? remote.buddy : local.buddy)?.groupCode ?? null },
    auth: local.auth,
    updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0),
  };
  return normalizeData(merged, local);
}

async function fetchDoc(sync: Settings['sync']): Promise<CutepadData | null> {
  if (sync.provider === 'firebase') {
    const { firebaseFetch } = await import('./cloud');
    return firebaseFetch();
  }
  const url = `${restBase(sync)}/${DOC_TABLE}?id=eq.${DOC_ID}&owner=eq.${encodeURIComponent(sync.owner)}&select=data`;
  const res = await fetch(url, { headers: headers(sync) });
  if (!res.ok) throw new Error(`sync fetch failed (${res.status})`);
  const rows = (await res.json()) as { data: CutepadData }[];
  return rows[0]?.data ?? null;
}

async function pushDoc(sync: Settings['sync'], data: CutepadData): Promise<void> {
  if (sync.provider === 'firebase') {
    const { firebasePush } = await import('./cloud');
    await firebasePush(data);
    return;
  }
  const url = `${restBase(sync)}/${DOC_TABLE}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers(sync), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([
      { id: DOC_ID, owner: sync.owner, data, updated_at: new Date(data.updatedAt || Date.now()).toISOString() },
    ]),
  });
  if (!res.ok) throw new Error(`sync push failed (${res.status})`);
}

let inFlight: Promise<'ok' | 'skipped' | 'error'> | null = null;

/** data-deletion flow: erase the remote backup for the current device/account (local data is kept). */
export async function deleteCloudBackup(): Promise<void> {
  const sync = useApp.getState().settings.sync;
  if (!syncConfigured(sync)) throw new Error('sync is not configured');
  if (sync.provider === 'firebase') {
    const { firebaseDelete } = await import('./cloud');
    await firebaseDelete();
    return;
  }
  const url = `${restBase(sync)}/${DOC_TABLE}?id=eq.${DOC_ID}&owner=eq.${encodeURIComponent(sync.owner)}`;
  const res = await fetch(url, { method: 'DELETE', headers: headers(sync) });
  if (!res.ok) throw new Error(`delete failed (${res.status})`);
}

/**
 * Login/restore path: fetch the signed-in account's own backup and replace this device's state
 * with it. Applies NOTHING when the session changed while the fetch was in flight (logout or
 * account switch) — no cross-account leakage, no resurrecting a logged-out session. Local state
 * is kept when the account has no backup yet or the fetch fails.
 */
export async function restoreAccountData(expectedEmail?: string): Promise<'restored' | 'no-backup' | 'error'> {
  try {
    const { firebaseFetch } = await import('./cloud');
    const remote = await firebaseFetch();
    if (!remote) return 'no-backup';
    const state = useApp.getState();
    const live = state.auth;
    if (!live.isLoggedIn || (expectedEmail !== undefined && live.user?.email !== expectedEmail)) return 'error';
    const liveUser = live.user;
    state.importData(remote);
    // re-assert the live session over the backup's auth record, carrying its @username back in
    if (liveUser) applyAuthUser(liveUser);
    return 'restored';
  } catch {
    return 'error';
  }
}

export function performSync(): Promise<'ok' | 'skipped' | 'error'> {
  if (inFlight) return inFlight;
  inFlight = runSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runSync(): Promise<'ok' | 'skipped' | 'error'> {
  const app = useApp;
  const state = app.getState();
  const sync = state.settings.sync;
  if (!syncConfigured(sync)) {
    state.setSyncStatus({ state: 'off', error: null });
    return 'skipped';
  }
  if (!state.settings.legal?.sync) {
    state.setSyncStatus({ state: 'off', error: null });
    return 'skipped';
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    state.setSyncStatus({ state: 'offline', error: null });
    return 'skipped';
  }
  state.setSyncStatus({ state: 'syncing', error: null });
  try {
    const local = selectData(state);
    const remote = await fetchDoc(sync);
    const merged = remote ? mergeData(local, remote) : local;
    await pushDoc(sync, merged);
    const currentLocal = selectData(app.getState());
    if (JSON.stringify(currentLocal) !== JSON.stringify(merged)) {
      app.getState().importData(merged);
    }
    app.getState().setSyncStatus({ state: 'synced', lastSyncedAt: Date.now(), error: null });
    return 'ok';
  } catch (err) {
    const message = err instanceof Error ? err.message : 'sync failed';
    app.getState().setSyncStatus({ state: 'error', error: message });
    return 'error';
  }
}

export async function pushBuddyPresence(pairCode: string, payload: BuddyPresence): Promise<void> {
  const sync = useApp.getState().settings.sync;
  if (!syncConfigured(sync)) return;
  if (!useApp.getState().settings.legal?.share) return;
  const url = `${restBase(sync)}/${BUDDY_TABLE}`;
  await fetch(url, {
    method: 'POST',
    headers: { ...headers(sync), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{ pair_code: pairCode, payload, updated_at: new Date().toISOString() }]),
  });
}

export async function fetchBuddyPartner(pairCode: string): Promise<{ payload: BuddyPresence; updated_at: string } | null> {
  const sync = useApp.getState().settings.sync;
  if (!syncConfigured(sync)) return null;
  const url = `${restBase(sync)}/${BUDDY_TABLE}?pair_code=eq.${encodeURIComponent(pairCode)}&select=payload,updated_at`;
  const res = await fetch(url, { headers: headers(sync) });
  if (!res.ok) throw new Error(`buddy fetch failed (${res.status})`);
  const rows = (await res.json()) as { payload: BuddyPresence; updated_at: string }[];
  return rows[0] ?? null;
}

export function generatePairCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

// ===== V3: public note pages =====

export interface PublicNotePayload {
  slug: string;
  title: string;
  html: string;
  text: string;
  tags: string[];
  color: string;
  owner: string;
  updated_at: string;
}

export interface PublicFetchConfig {
  url: string;
  anonKey: string;
}

function randomSlug(): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function publicConfigured(config: Partial<PublicFetchConfig>): boolean {
  return !!config.url && !!config.anonKey;
}

export async function publishNote(note: Note): Promise<string> {
  const state = useApp.getState();
  const sync = state.settings.sync;
  if (!syncConfigured(sync)) throw new Error('sync is not configured — set up Supabase in Settings first');
  if (!state.settings.legal?.publish) throw new Error('publish consent required — tick the consent box in the note header');
  const slug = note.share?.slug ?? randomSlug();
  const payload: PublicNotePayload = {
    slug,
    title: note.title || 'Untitled note',
    html: note.html,
    text: note.text,
    tags: note.tags,
    color: note.color,
    owner: sync.owner,
    updated_at: new Date().toISOString(),
  };
  const url = `${restBase(sync)}/${PUBLIC_TABLE}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers(sync), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([payload]),
  });
  if (!res.ok) throw new Error(`publish failed (${res.status})`);
  state.updateNote(note.id, { share: { slug, publishedAt: Date.now() } });
  return slug;
}

export async function unpublishNote(noteId: string): Promise<void> {
  const state = useApp.getState();
  const sync = state.settings.sync;
  const note = state.notes.find((n) => n.id === noteId);
  if (!note?.share) return;
  if (syncConfigured(sync)) {
    const url = `${restBase(sync)}/${PUBLIC_TABLE}?slug=eq.${encodeURIComponent(note.share.slug)}&owner=eq.${encodeURIComponent(sync.owner)}`;
    await fetch(url, { method: 'DELETE', headers: headers(sync) }).catch(() => undefined);
  }
  state.updateNote(noteId, { share: null });
}

export async function fetchPublicNote(slug: string, config: PublicFetchConfig): Promise<PublicNotePayload | null> {
  if (!publicConfigured(config)) return null;
  const base = config.url.replace(/\/$/, '') + '/rest/v1';
  const url = `${base}/${PUBLIC_TABLE}?slug=eq.${encodeURIComponent(slug)}&select=*`;
  const res = await fetch(url, {
    headers: { apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`share fetch failed (${res.status})`);
  const rows = (await res.json()) as PublicNotePayload[];
  return rows[0] ?? null;
}

export function shareUrlFor(slug: string, config: PublicFetchConfig): string {
  const origin = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
  const params = new URLSearchParams({ s: config.url, k: config.anonKey });
  return `${origin}#/share/${slug}?${params.toString()}`;
}

// ===== V3: group schedule sharing =====

export interface GroupMemberRow {
  group_code: string;
  member: string;
  payload: BuddyPresence;
  updated_at: string;
}

export async function pushGroupPresence(groupCode: string, member: string, payload: BuddyPresence): Promise<void> {
  const sync = useApp.getState().settings.sync;
  if (!syncConfigured(sync)) return;
  if (!useApp.getState().settings.legal?.share) return;
  const url = `${restBase(sync)}/${GROUP_TABLE}`;
  await fetch(url, {
    method: 'POST',
    headers: { ...headers(sync), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{ group_code: groupCode, member, payload, updated_at: new Date().toISOString() }]),
  });
}

export async function fetchGroupPresence(groupCode: string): Promise<GroupMemberRow[]> {
  const sync = useApp.getState().settings.sync;
  if (!syncConfigured(sync)) return [];
  const url = `${restBase(sync)}/${GROUP_TABLE}?group_code=eq.${encodeURIComponent(groupCode)}&select=group_code,member,payload,updated_at`;
  const res = await fetch(url, { headers: headers(sync) });
  if (!res.ok) throw new Error(`group fetch failed (${res.status})`);
  return (await res.json()) as GroupMemberRow[];
}

export function pushGroupSchedule(groupCode: string, blocks: unknown): Promise<void> {
  const sync = useApp.getState().settings.sync;
  if (!syncConfigured(sync)) return Promise.resolve();
  if (!useApp.getState().settings.legal?.share) return Promise.resolve();
  const url = `${restBase(sync)}/${GROUP_TABLE}`;
  const payload: BuddyPresence = {
    name: 'schedule',
    minutesToday: 0,
    totalMinutes: 0,
    streak: 0,
    sessions: 0,
    mood: JSON.stringify(blocks),
    at: Date.now(),
  };
  return fetch(url, {
    method: 'POST',
    headers: { ...headers(sync), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{ group_code: groupCode, member: '__schedule__', payload, updated_at: new Date().toISOString() }]),
  }).then(() => undefined);
}

export function startAutoSync(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const eligible = () => {
    const { settings } = useApp.getState();
    return settings.sync.autoSync && syncConfigured(settings.sync) && !!settings.legal?.sync;
  };
  const tick = () => {
    // runSync itself handles consent (marks status 'off' when it's missing)
    const { settings } = useApp.getState();
    if (settings.sync.autoSync && syncConfigured(settings.sync)) void performSync();
  };

  // write-through: Firestore is the primary save target — push ~2s after every change
  let lastSeen = useApp.getState().updatedAt;
  let saveTimer: number | null = null;
  const unsubscribe = useApp.subscribe((state) => {
    if (state.updatedAt === lastSeen) return;
    lastSeen = state.updatedAt;
    if (saveTimer !== null) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      saveTimer = null;
      if (eligible()) void performSync();
    }, 2000);
  });

  const interval = window.setInterval(tick, 45000);
  const onOnline = () => tick();
  window.addEventListener('online', onOnline);
  tick();
  return () => {
    unsubscribe();
    if (saveTimer !== null) window.clearTimeout(saveTimer);
    window.clearInterval(interval);
    window.removeEventListener('online', onOnline);
  };
}

export type { SyncStatus };
