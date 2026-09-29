import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  EmailAuthProvider,
  getAuth,
  linkWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import { doc, deleteDoc, getDoc, getFirestore, setDoc, type Firestore } from 'firebase/firestore';
import type { CutepadData } from './types';

/**
 * Built-in cloud backup via Firebase Cloud Firestore.
 * One fixed project (cutepad-aca8c), per-device anonymous accounts —
 * no user emails, no analytics SDK, data isolated per uid by security rules.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyDSbjmLUrqtxI8qoNYa872NTKh8Kr0Zrok',
  authDomain: 'cutepad-aca8c.firebaseapp.com',
  projectId: 'cutepad-aca8c',
  storageBucket: 'cutepad-aca8c.firebasestorage.app',
  messagingSenderId: '672778714864',
  appId: '1:672778714864:web:f19fb3b776a190ae134c35',
};

interface Services {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let services: Services | null = null;

function getServices(): Services {
  if (!services) {
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    services = { app, auth: getAuth(app), db: getFirestore(app) };
  }
  return services;
}

function friendlyError(err: unknown): Error {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: unknown }).code) : '';
  const message = err instanceof Error ? err.message : String(err);
  if (code.includes('auth/admin-restricted-operation')) {
    return new Error('firebase: enable Anonymous sign-in (Authentication → Sign-in method → Anonymous) in your Firebase console');
  }
  if (code.includes('permission-denied')) {
    return new Error('firebase: Firestore denied access — publish docs/firestore.rules in the Firebase console (Firestore → Rules)');
  }
  if (code.includes('unavailable') || code.includes('failed-precondition')) {
    return new Error('firebase: could not reach Firestore (offline or database not created yet)');
  }
  if (code.includes('invalid-api-key') || code.includes('auth/argument-error')) {
    return new Error('firebase: invalid project config — check packages/core/src/cloud.ts');
  }
  if (code.includes('auth/operation-not-allowed')) {
    return new Error('firebase: enable Email/Password sign-in (Authentication → Sign-in method → Email/Password)');
  }
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) {
    return new Error("that email and password don't match — try again 💗");
  }
  if (code.includes('auth/user-not-found')) {
    return new Error('no account found with that email — create one instead?');
  }
  if (code.includes('auth/email-already-in-use')) {
    return new Error('an account with that email already exists — log in instead');
  }
  if (code.includes('auth/weak-password')) {
    return new Error('password must be at least 6 characters');
  }
  if (code.includes('auth/invalid-email')) {
    return new Error('please enter a valid email address');
  }
  if (code.includes('auth/too-many-requests')) {
    return new Error('too many attempts — wait a moment and try again');
  }
  if (code.includes('auth/network-request-failed')) {
    return new Error('network error — check your connection');
  }
  if (code.includes('auth/user-disabled')) {
    return new Error('this account has been disabled');
  }
  if (code.includes('auth/requires-recent-login')) {
    return new Error('for security, please log in again before continuing');
  }
  return new Error(`firebase: ${message}`);
}

async function ensureUid(): Promise<string> {
  const { auth } = getServices();
  if (auth.currentUser) return auth.currentUser.uid;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch (err) {
    throw friendlyError(err);
  }
}

export async function firebaseFetch(): Promise<CutepadData | null> {
  try {
    const { db } = getServices();
    const uid = await ensureUid();
    const snap = await getDoc(doc(db, 'users', uid, 'app', 'state'));
    const raw = snap.data()?.json;
    if (typeof raw !== 'string' || raw.length === 0) return null;
    return JSON.parse(raw) as CutepadData;
  } catch (err) {
    throw friendlyError(err);
  }
}

export async function firebasePush(data: CutepadData): Promise<void> {
  try {
    const { db } = getServices();
    const uid = await ensureUid();
    await setDoc(doc(db, 'users', uid, 'app', 'state'), {
      json: JSON.stringify(data),
      updatedAt: data.updatedAt ?? Date.now(),
    });
  } catch (err) {
    throw friendlyError(err);
  }
}

export async function firebaseDelete(): Promise<void> {
  try {
    const { db } = getServices();
    const uid = await ensureUid();
    await deleteDoc(doc(db, 'users', uid, 'app', 'state'));
  } catch (err) {
    throw friendlyError(err);
  }
}

export interface AuthUser {
  email: string;
  name: string;
  /** profile picture as a data URL (Firebase photoURL) */
  avatar?: string;
  /** ISO date the Firebase account was created */
  since?: string;
}

function toAuthUser(u: User): AuthUser {
  return {
    email: u.email ?? '',
    name: u.displayName || u.email?.split('@')[0] || 'Friend',
    avatar: u.photoURL || undefined,
    since: u.metadata.creationTime || undefined,
  };
}

export async function firebaseLogin(email: string, pass: string): Promise<AuthUser> {
  try {
    const { auth } = getServices();
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return toAuthUser(cred.user);
  } catch (err) {
    throw friendlyError(err);
  }
}

export async function firebaseSignUp(name: string, email: string, pass: string): Promise<AuthUser> {
  try {
    const { auth } = getServices();
    const guest = auth.currentUser;
    let user: User;
    if (guest?.isAnonymous) {
      // link the guest session so its uid (and all local data) carries into the new account
      const cred = await linkWithCredential(guest, EmailAuthProvider.credential(email, pass));
      user = cred.user;
    } else {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      user = cred.user;
    }
    if (name.trim()) {
      await updateProfile(user, { displayName: name.trim() });
    }
    const base = toAuthUser(user);
    return { ...base, name: name.trim() || base.name };
  } catch (err) {
    throw friendlyError(err);
  }
}

/**
 * Update the signed-in user's display name and/or profile picture — travels with the account,
 * not this device. `avatar` is a data URL to set, `null` to remove, `undefined` to keep.
 */
export async function firebaseUpdateProfile(name: string, avatar?: string | null): Promise<AuthUser> {
  try {
    const { auth } = getServices();
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('no signed-in user');
    const trimmed = name.trim();
    const patch: { displayName?: string; photoURL?: string | null } = {};
    if (trimmed) patch.displayName = trimmed;
    if (avatar !== undefined) patch.photoURL = avatar;
    if (patch.displayName !== undefined || patch.photoURL !== undefined) {
      await updateProfile(user, patch);
    }
    const base = toAuthUser(user);
    return {
      ...base,
      name: trimmed || base.name,
      avatar: avatar === undefined ? base.avatar : avatar || undefined,
    };
  } catch (err) {
    throw friendlyError(err);
  }
}

export async function firebaseResetPassword(email: string): Promise<void> {
  try {
    const { auth } = getServices();
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    throw friendlyError(err);
  }
}

export async function firebaseLogout(): Promise<void> {
  try {
    const { auth } = getServices();
    await signOut(auth);
  } catch (err) {
    throw friendlyError(err);
  }
}

/** Fires with the signed-in email user (guest/anonymous sessions count as signed out) or null. */
export function onFirebaseAuthChange(cb: (user: AuthUser | null) => void): () => void {
  const { auth } = getServices();
  return onAuthStateChanged(auth, (user) => {
    cb(user && user.email ? toAuthUser(user) : null);
  });
}

