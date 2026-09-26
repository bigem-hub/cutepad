import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc, type Firestore } from 'firebase/firestore';
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
