import { create } from 'zustand';
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { authReady, cloudError, currentUid, firestoreDb } from './cloud';
import { defaultUsername } from './profile';
import { useApp } from './store';
import type { Note } from './types';

/**
 * Social layer: profiles, unique @handles, friend requests, connections and a
 * per-user inbox (notifications + shared notes). Everything lives in Firestore
 * and is validated by docs/firestore.rules — this module never trusts itself.
 */

const HANDLE_RE = /^[a-z0-9_.]{1,24}$/;
const INBOX_LIMIT = 50;
const SEARCH_LIMIT = 10;
const SHARE_MAX_HTML = 120000;

export interface SocialProfile {
  uid: string;
  name: string;
  username: string;
  avatar?: string;
  nameLower: string;
  discoverable: boolean;
  requestsAllowed: boolean;
  blocked: string[];
  updatedAt: number;
}

export interface FriendEntry {
  uid: string;
  name: string;
  username: string;
  since: number;
}

export interface SocialRequest {
  id: string;
  from: string;
  fromName: string;
  fromUsername: string;
  to: string;
  toName: string;
  toUsername: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}

export interface SharedNote {
  title: string;
  html: string;
  text?: string;
  color?: string;
}

export interface InboxEvent {
  id: string;
  type: 'request' | 'accepted' | 'share';
  from: string;
  to: string;
  fromName: string;
  fromUsername: string;
  message?: string | null;
  share?: SharedNote;
  createdAt: number;
  read: boolean;
}

export type RelationStatus = 'self' | 'none' | 'sent' | 'incoming' | 'friends' | 'blockedByMe' | 'blockedByThem';

interface SocialState {
  profile: SocialProfile | null;
  friends: FriendEntry[];
  incoming: SocialRequest[];
  outgoing: SocialRequest[];
  inbox: InboxEvent[];
  loading: boolean;
  error: string | null;
}

const EMPTY: SocialState = { profile: null, friends: [], incoming: [], outgoing: [], inbox: [], loading: false, error: null };

export const useSocial = create<SocialState>(() => ({ ...EMPTY }));

export function resetSocial(): void {
  useSocial.setState({ ...EMPTY });
}

/** pair id shared by friend_requests + connections (sorted uids) */
export function pairId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

async function meOrThrow(): Promise<string> {
  // wait out the post-reload restore window so a signed-in user is never
  // mistaken for a guest (the session is there, it just hasn't loaded yet)
  await authReady();
  const uid = currentUid();
  if (!uid) throw new Error('sign in to connect with friends 💗');
  return uid;
}

function myIdentity(): { name: string; handle: string; avatar?: string } {
  const user = useApp.getState().auth.user;
  if (!user) throw new Error('sign in to connect with friends 💗');
  return { name: user.name, handle: user.username || defaultUsername(user.email), avatar: user.avatar };
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' ? Number.isFinite(v) ? v : fallback : fallback;
}

function normalizeProfile(id: string, raw: Record<string, unknown>): SocialProfile {
  const blocked = Array.isArray(raw.blocked) ? (raw.blocked.filter((x) => typeof x === 'string') as string[]) : [];
  const username = str(raw.username) || id;
  return {
    uid: id,
    name: str(raw.name) || username,
    username,
    avatar: typeof raw.avatar === 'string' && raw.avatar ? raw.avatar : undefined,
    nameLower: str(raw.nameLower) || str(raw.name).toLowerCase(),
    discoverable: raw.discoverable !== false,
    requestsAllowed: raw.requestsAllowed !== false,
    blocked,
    updatedAt: num(raw.updatedAt),
  };
}

function normalizeRequest(id: string, raw: Record<string, unknown>): SocialRequest {
  const status = str(raw.status);
  return {
    id,
    from: str(raw.from),
    fromName: str(raw.fromName),
    fromUsername: str(raw.fromUsername),
    to: str(raw.to),
    toName: str(raw.toName),
    toUsername: str(raw.toUsername),
    status: (status === 'accepted' || status === 'rejected' || status === 'cancelled' ? status : 'pending'),
    createdAt: num(raw.createdAt),
    updatedAt: num(raw.updatedAt),
  };
}

function normalizeInbox(id: string, raw: Record<string, unknown>): InboxEvent {
  const type = str(raw.type);
  const share = raw.share as SharedNote | undefined;
  return {
    id,
    type: (type === 'accepted' || type === 'share' ? type : 'request'),
    from: str(raw.from),
    to: str(raw.to),
    fromName: str(raw.fromName),
    fromUsername: str(raw.fromUsername),
    message: typeof raw.message === 'string' ? raw.message : null,
    share: share && typeof share === 'object' && typeof share.html === 'string' ? share : undefined,
    createdAt: num(raw.createdAt),
    read: raw.read === true,
  };
}

/** what a stranger sees: never the raw doc, always a bounded profile */
function toPublic(profile: SocialProfile): SocialProfile {
  return { ...profile, blocked: [] };
}

// ===== profile directory =====

/** Read one profile doc (public fields). */
export async function getProfile(uid: string): Promise<SocialProfile | null> {
  try {
    const snap = await getDoc(doc(firestoreDb(), 'profiles', uid));
    return snap.exists() ? normalizeProfile(snap.id, snap.data()) : null;
  } catch {
    return null;
  }
}

/**
 * Create/refresh this account's public profile + claim its @handle in the
 * unique registry (best-effort: a handle owned by someone else is skipped).
 * Called on login, after profile edits, and before any social action.
 */
export async function ensureMyProfile(): Promise<SocialProfile | null> {
  const uid = await meOrThrow();
  const id = myIdentity();
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const db = firestoreDb();
      const ref = doc(db, 'profiles', uid);
      const snap = await getDoc(ref);
      const prev = snap.exists() ? normalizeProfile(uid, snap.data()) : null;
      const profile: SocialProfile = {
        uid,
        name: id.name,
        username: id.handle,
        avatar: id.avatar,
        nameLower: id.name.toLowerCase(),
        discoverable: prev ? prev.discoverable : true,
        requestsAllowed: prev ? prev.requestsAllowed : true,
        blocked: prev ? prev.blocked : [],
        updatedAt: Date.now(),
      };
      const data: Record<string, unknown> = {
        uid: profile.uid,
        name: profile.name,
        username: profile.username,
        nameLower: profile.nameLower,
        discoverable: profile.discoverable,
        requestsAllowed: profile.requestsAllowed,
        blocked: profile.blocked,
        updatedAt: profile.updatedAt,
      };
      if (profile.avatar && profile.avatar.length <= 150000) data.avatar = profile.avatar;
      await setDoc(ref, data, { merge: true });

      // unique handle registry: migrate to the new handle when it changed
      if (prev && prev.username && prev.username !== profile.username) {
        try {
          const old = await getDoc(doc(db, 'usernames', prev.username));
          if (old.exists() && old.data()?.uid === uid) await deleteDoc(doc(db, 'usernames', prev.username));
        } catch {
          /* stale registry rows are harmless */
        }
      }
      try {
        const handleRef = doc(db, 'usernames', profile.username);
        const handleSnap = await getDoc(handleRef);
        if (!handleSnap.exists()) {
          await setDoc(handleRef, { uid, username: profile.username, name: profile.name, updatedAt: profile.updatedAt });
        } else if (handleSnap.data()?.uid === uid) {
          await setDoc(handleRef, { name: profile.name, updatedAt: profile.updatedAt }, { merge: true });
        }
      } catch {
        /* handle taken by someone else — display handle still works locally */
      }

      useSocial.setState({ profile, error: null });
      return profile;
    } catch (err) {
      lastErr = err;
      // signed out or switched accounts mid-flight — stay quiet
      try {
        if ((await meOrThrow()) !== uid) return null;
      } catch {
        return null;
      }
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
    }
  }
  useSocial.setState({ profile: null, error: cloudError(lastErr).message });
  return null;
}

/** Is this @handle free (or mine)? Checked before saving a new username. */
export async function checkHandleAvailable(handle: string): Promise<boolean> {
  const uid = currentUid();
  const clean = handle.trim().toLowerCase();
  if (!HANDLE_RE.test(clean)) return false;
  try {
    const snap = await getDoc(doc(firestoreDb(), 'usernames', clean));
    if (!snap.exists()) return true;
    return snap.data()?.uid === uid;
  } catch {
    return false;
  }
}

/** Privacy controls live on the profile doc — the rules read them directly. */
export async function setPrivacy(patch: { requestsAllowed?: boolean; discoverable?: boolean }): Promise<void> {
  if (!useSocial.getState().profile) await ensureMyProfile();
  try {
    const uid = await meOrThrow();
    const data: Record<string, unknown> = { updatedAt: Date.now() };
    if (patch.requestsAllowed !== undefined) data.requestsAllowed = patch.requestsAllowed;
    if (patch.discoverable !== undefined) data.discoverable = patch.discoverable;
    await updateDoc(doc(firestoreDb(), 'profiles', uid), data);
    const profile = useSocial.getState().profile;
    useSocial.setState({ profile: profile ? { ...profile, ...patch, updatedAt: num(data.updatedAt) } : profile });
  } catch (err) {
    throw cloudError(err);
  }
}

// ===== search =====

/**
 * Find people by exact @handle, uid, or name prefix.
 * Discoverable=false profiles are filtered out client-side too, so every
 * search path respects the privacy toggle.
 */
export async function searchPeople(raw: string): Promise<SocialProfile[]> {
  const uid = await meOrThrow();
  const term = raw.trim().replace(/^@/, '').toLowerCase();
  if (!term) return [];
  const db = firestoreDb();
  const found = new Map<string, SocialProfile>();
  const add = (p: SocialProfile | null) => {
    if (p && p.uid !== uid && p.discoverable && !found.has(p.uid)) found.set(p.uid, p);
  };
  // each lookup is best-effort: a failing fallback must not discard earlier hits
  // (the first error still surfaces when nothing at all was found)
  let firstErr: unknown = null;
  const step = async (run: () => Promise<void>) => {
    if (found.size >= SEARCH_LIMIT) return;
    try {
      await run();
    } catch (err) {
      if (!firstErr) firstErr = err;
    }
  };
  await step(async () => {
    // 1) exact handle via the unique registry — server-forced so a dead
    //    channel surfaces as an error instead of a silently empty result
    const handleSnap = await getDocFromServer(doc(db, 'usernames', term));
    if (handleSnap.exists()) {
      const p = await getProfile(str(handleSnap.data()?.uid));
      add(p);
    }
  });
  await step(async () => {
    // 2) exact uid (firebase uids are url-safe base64, 8–64 chars)
    if (found.size === 0 && /^[A-Za-z0-9_-]{8,64}$/.test(term)) add(await getProfile(term));
  });
  await step(async () => {
    // 3) exact handle straight from the directory — the rules only return
    //    profiles whose query proves discoverable, so the filter rides along
    if (found.size < SEARCH_LIMIT) {
      const byHandle = await getDocsFromServer(
        query(
          collection(db, 'profiles'),
          where('username', '==', term),
          where('discoverable', '==', true),
          limit(SEARCH_LIMIT),
        ),
      );
      byHandle.forEach((d) => add(normalizeProfile(d.id, d.data())));
    }
  });
  await step(async () => {
    // 4) name prefix (same discoverable filter — backed by the composite index)
    if (found.size < SEARCH_LIMIT) {
      const byName = await getDocsFromServer(
        query(
          collection(db, 'profiles'),
          where('nameLower', '>=', term),
          where('nameLower', '<=', `${term}`),
          where('discoverable', '==', true),
          limit(SEARCH_LIMIT),
        ),
      );
      byName.forEach((d) => add(normalizeProfile(d.id, d.data())));
    }
  });
  if (found.size === 0 && firstErr) throw cloudError(firstErr);
  return [...found.values()].slice(0, SEARCH_LIMIT);
}

// ===== loading my social state =====

async function loadRequests(uid: string): Promise<{ incoming: SocialRequest[]; outgoing: SocialRequest[] }> {
  const db = firestoreDb();
  const [asTo, asFrom] = await Promise.all([
    getDocs(query(collection(db, 'friend_requests'), where('to', '==', uid), limit(100))),
    getDocs(query(collection(db, 'friend_requests'), where('from', '==', uid), limit(100))),
  ]);
  const incoming: SocialRequest[] = [];
  const outgoing: SocialRequest[] = [];
  const seen = new Set<string>();
  asTo.forEach((d) => {
    const r = normalizeRequest(d.id, d.data());
    if (r.status === 'pending' && !seen.has(r.id)) {
      seen.add(r.id);
      incoming.push(r);
    }
  });
  asFrom.forEach((d) => {
    const r = normalizeRequest(d.id, d.data());
    if (r.status === 'pending' && !seen.has(r.id)) {
      seen.add(r.id);
      outgoing.push(r);
    }
  });
  incoming.sort((a, b) => b.createdAt - a.createdAt);
  outgoing.sort((a, b) => b.createdAt - a.createdAt);
  return { incoming, outgoing };
}

async function loadFriends(uid: string): Promise<FriendEntry[]> {
  const snap = await getDocs(query(collection(firestoreDb(), 'connections'), where('members', 'array-contains', uid), limit(200)));
  const friends: FriendEntry[] = [];
  snap.forEach((d) => {
    const raw = d.data();
    const members = Array.isArray(raw.members) ? (raw.members.filter((x) => typeof x === 'string') as string[]) : [];
    const other = members.find((m) => m !== uid);
    if (!other) return;
    const info = (raw.info ?? {}) as Record<string, { name?: unknown; username?: unknown }>;
    const theirs = info[other] ?? {};
    friends.push({
      uid: other,
      name: str(theirs.name) || str(theirs.username) || other,
      username: str(theirs.username) || other,
      since: num(raw.since),
    });
  });
  friends.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  return friends;
}

async function loadInbox(uid: string): Promise<InboxEvent[]> {
  const snap = await getDocs(
    query(collection(firestoreDb(), 'users', uid, 'inbox'), orderBy('createdAt', 'desc'), limit(INBOX_LIMIT)),
  );
  const events: InboxEvent[] = [];
  snap.forEach((d) => events.push(normalizeInbox(d.id, d.data())));
  return events;
}

/** Pull profile + friends + requests + inbox. Safe to call often (poller, after actions). */
export async function refreshSocial(): Promise<void> {
  if (!currentUid()) return;
  useSocial.setState({ loading: true });
  try {
    const uid = await meOrThrow();
    const [profile, requests, friends, inbox] = await Promise.all([
      getProfile(uid),
      loadRequests(uid),
      loadFriends(uid),
      loadInbox(uid),
    ]);
    useSocial.setState({ profile, ...requests, friends, inbox, loading: false, error: null });
  } catch (err) {
    useSocial.setState({ loading: false, error: cloudError(err).message });
  }
}

/** Cheap badge refresh — inbox only. */
export async function refreshInbox(): Promise<void> {
  if (!currentUid()) return;
  try {
    const inbox = await loadInbox(await meOrThrow());
    useSocial.setState({ inbox });
  } catch {
    /* keep the last known inbox on transient errors */
  }
}

// ===== relation status =====

/** Where do I stand with this person? Uses freshly loaded state. */
export function relationTo(their: SocialProfile | { uid: string; blocked?: string[] } | null): RelationStatus {
  const uid = currentUid();
  if (!uid || !their) return 'none';
  if (their.uid === uid) return 'self';
  const s = useSocial.getState();
  if (s.profile?.blocked.includes(their.uid)) return 'blockedByMe';
  const blockedList = Array.isArray(their.blocked) ? their.blocked : [];
  if (blockedList.includes(uid)) return 'blockedByThem';
  if (s.friends.some((f) => f.uid === their.uid)) return 'friends';
  if (s.incoming.some((r) => r.from === their.uid)) return 'incoming';
  if (s.outgoing.some((r) => r.to === their.uid)) return 'sent';
  return 'none';
}

// ===== friend requests =====

/** Send a request: one batched write (request + their inbox event), validated by rules via getAfter. */
export async function sendFriendRequest(to: SocialProfile): Promise<void> {
  const uid = await meOrThrow();
  if (to.uid === uid) throw new Error("you can't add yourself — nice try though 💗");
  const id = myIdentity();
  if (relationTo(to) !== 'none') throw new Error('a connection with this person already exists');
  try {
    const db = firestoreDb();
    const now = Date.now();
    const reqId = pairId(uid, to.uid);
    const batch = writeBatch(db);
    batch.set(doc(db, 'friend_requests', reqId), {
      from: uid,
      fromName: id.name,
      fromUsername: id.handle,
      to: to.uid,
      toName: to.name,
      toUsername: to.username,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
    batch.set(doc(db, 'users', to.uid, 'inbox', `req_${reqId}`), {
      type: 'request',
      from: uid,
      to: to.uid,
      fromName: id.name,
      fromUsername: id.handle,
      createdAt: now,
      read: false,
    });
    await batch.commit();
    await refreshSocial();
  } catch (err) {
    throw friendlySocial(err, 'could not send the request — their privacy settings may block new connections');
  }
}

export async function cancelFriendRequest(pair: string): Promise<void> {
  try {
    await updateDoc(doc(firestoreDb(), 'friend_requests', pair), { status: 'cancelled', updatedAt: Date.now() });
    await refreshSocial();
  } catch (err) {
    throw friendlySocial(err, 'could not cancel that request');
  }
}

export async function rejectFriendRequest(pair: string): Promise<void> {
  try {
    await updateDoc(doc(firestoreDb(), 'friend_requests', pair), { status: 'rejected', updatedAt: Date.now() });
    await refreshInbox();
    await refreshSocial();
  } catch (err) {
    throw friendlySocial(err, 'could not decline that request');
  }
}

/**
 * Accept: one atomic batch — flip the request, create the connection,
 * drop an accepted notice into their inbox. Rules verify all three via getAfter.
 */
export async function acceptFriendRequest(req: SocialRequest | { id: string; from: string; fromName: string; fromUsername: string }): Promise<void> {
  const uid = await meOrThrow();
  const id = myIdentity();
  try {
    const db = firestoreDb();
    const now = Date.now();
    const their = await getProfile(req.from);
    const batch = writeBatch(db);
    batch.update(doc(db, 'friend_requests', req.id), { status: 'accepted', updatedAt: now });
    batch.set(doc(db, 'connections', req.id), {
      members: [req.from, uid],
      since: now,
      info: {
        [req.from]: { name: req.fromName || their?.name || req.fromUsername, username: req.fromUsername || their?.username || '' },
        [uid]: { name: id.name, username: id.handle },
      },
    });
    batch.set(doc(db, 'users', req.from, 'inbox', `acc_${req.id}`), {
      type: 'accepted',
      from: uid,
      to: req.from,
      fromName: id.name,
      fromUsername: id.handle,
      createdAt: now,
      read: false,
    });
    await batch.commit();
    await refreshSocial();
  } catch (err) {
    throw friendlySocial(err, 'could not accept that request');
  }
}

/** Drop the connection record — both sides lose it (shared doc). */
export async function removeFriend(pair: string): Promise<void> {
  try {
    await deleteDoc(doc(firestoreDb(), 'connections', pair));
    await refreshSocial();
  } catch (err) {
    throw friendlySocial(err, 'could not remove that friend');
  }
}

// ===== blocking =====

/** Block: add to my list + undo any connection/request between us. */
export async function blockUser(theirUid: string): Promise<void> {
  const uid = await meOrThrow();
  if (theirUid === uid) return;
  if (!useSocial.getState().profile) await ensureMyProfile();
  try {
    const db = firestoreDb();
    await updateDoc(doc(db, 'profiles', uid), { blocked: arrayUnion(theirUid), updatedAt: Date.now() });
    const pair = pairId(uid, theirUid);
    await deleteDoc(doc(db, 'connections', pair)).catch(() => undefined);
    const req = await getDoc(doc(db, 'friend_requests', pair));
    if (req.exists() && req.data()?.status === 'pending') {
      await deleteDoc(doc(db, 'friend_requests', pair)).catch(() => undefined);
    }
    const profile = useSocial.getState().profile;
    useSocial.setState({
      profile: profile ? { ...profile, blocked: [...profile.blocked, theirUid] } : profile,
    });
    await refreshSocial();
  } catch (err) {
    throw friendlySocial(err, 'could not block this person');
  }
}

export async function unblockUser(theirUid: string): Promise<void> {
  const uid = await meOrThrow();
  if (!useSocial.getState().profile) await ensureMyProfile();
  try {
    const profile = useSocial.getState().profile;
    const next = (profile?.blocked ?? []).filter((x) => x !== theirUid);
    await updateDoc(doc(firestoreDb(), 'profiles', uid), { blocked: next, updatedAt: Date.now() });
    useSocial.setState({ profile: profile ? { ...profile, blocked: next } : profile });
  } catch (err) {
    throw friendlySocial(err, 'could not unblock this person');
  }
}

// ===== sharing =====

/**
 * Send a note snapshot into each friend's inbox. One batched write,
 * gated by the share consent (same one the buddy/status sharing uses).
 */
export async function sendNoteShare(note: Note, toUids: string[], message: string): Promise<void> {
  const uid = await meOrThrow();
  if (!useApp.getState().settings.legal?.share) {
    throw new Error('share consent required — tick the consent box to send notes to friends');
  }
  const targets = [...new Set(toUids)].filter((x) => x && x !== uid);
  if (targets.length === 0) throw new Error('pick at least one friend to send to');
  if (note.html.length > SHARE_MAX_HTML) {
    throw new Error('this note is too big to send — keep it under ~100KB');
  }
  const id = myIdentity();
  try {
    const db = firestoreDb();
    const now = Date.now();
    const batch = writeBatch(db);
    const share: SharedNote = {
      title: note.title.slice(0, 200) || 'Untitled note',
      html: note.html,
      text: note.text.slice(0, SHARE_MAX_HTML),
      color: note.color,
    };
    targets.forEach((to, i) => {
      const event: Record<string, unknown> = {
        type: 'share',
        from: uid,
        to,
        fromName: id.name,
        fromUsername: id.handle,
        share,
        createdAt: now + i,
        read: false,
      };
      const trimmed = message.trim();
      if (trimmed) event.message = trimmed.slice(0, 500);
      batch.set(doc(db, 'users', to, 'inbox', `share_${now}_${i}_${uid.slice(0, 8)}`), event);
    });
    await batch.commit();
    await refreshInbox();
  } catch (err) {
    throw friendlySocial(err, 'could not send that note');
  }
}

export async function markEventRead(eventId: string): Promise<void> {
  const uid = await meOrThrow();
  try {
    await updateDoc(doc(firestoreDb(), 'users', uid, 'inbox', eventId), { read: true });
    useSocial.setState({
      inbox: useSocial.getState().inbox.map((e) => (e.id === eventId ? { ...e, read: true } : e)),
    });
  } catch {
    /* cosmetic — the next poll syncs it */
  }
}

export async function deleteEvent(eventId: string): Promise<void> {
  const uid = await meOrThrow();
  try {
    await deleteDoc(doc(firestoreDb(), 'users', uid, 'inbox', eventId));
    useSocial.setState({ inbox: useSocial.getState().inbox.filter((e) => e.id !== eventId) });
  } catch {
    /* cosmetic */
  }
}

// ===== helpers =====

function friendlySocial(err: unknown, fallback: string): Error {
  const mapped = cloudError(err);
  if (mapped.message.includes('permission-denied') || mapped.message.includes('Firestore denied')) {
    return new Error(`${fallback} — or publish docs/firestore.rules if you haven't yet`);
  }
  return mapped.message.startsWith('firebase:') || mapped.message.includes('sign in') ? mapped : new Error(fallback);
}

let pollTimer: number | null = null;
let pollFocus: (() => void) | null = null;

/** Background freshness for the bell badge — full refresh every 30s + on focus. */
export function startSocialPolling(): () => void {
  const stop = () => {
    if (pollTimer !== null) window.clearInterval(pollTimer);
    if (pollFocus) window.removeEventListener('focus', pollFocus);
    pollTimer = null;
    pollFocus = null;
  };
  stop();
  if (!currentUid()) return stop;
  const tick = () => {
    if (currentUid()) void refreshSocial();
  };
  pollTimer = window.setInterval(tick, 30000);
  pollFocus = () => tick();
  window.addEventListener('focus', pollFocus);
  void refreshSocial();
  return stop;
}
