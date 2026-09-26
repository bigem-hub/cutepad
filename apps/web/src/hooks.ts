import { useEffect, useRef, useState } from 'react';
import {
  ambient,
  dueReminders,
  getBridge,
  isDesktop,
  selectData,
  useApp,
  type AmbientId,
  type MascotMood,
} from '@cutepad/core';

export function notifyUser(title: string, body: string): void {
  const bridge = getBridge();
  if (bridge) {
    bridge.notify(title, body);
    return;
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(title, { body });
    } catch {
      /* ignored */
    }
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (getBridge()) return true;
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function useReminderTicker(): void {
  useEffect(() => {
    const tick = () => {
      const due = dueReminders(useApp.getState().reminders);
      if (due.length === 0) return;
      void ensureNotificationPermission();
      for (const reminder of due) {
        notifyUser('Cutepad reminder 🔔', reminder.title);
        useApp.getState().fireReminder(reminder.id);
        useApp.getState().pushEvent('encourage', `⏰ ${reminder.title}`);
      }
    };
    tick();
    const id = window.setInterval(tick, 20000);
    return () => window.clearInterval(id);
  }, []);
}

export function useDesktopBackup(): void {
  useEffect(() => {
    if (!isDesktop()) return;
    let timer: number | undefined;
    const unsubscribe = useApp.subscribe((state) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        try {
          void getBridge()?.saveBackup(JSON.stringify(selectData(state)));
        } catch {
          /* backup is best-effort */
        }
      }, 4000);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);
}

export function useAmbient(): void {
  const track = useApp((s) => s.settings.ambient.track);
  const volume = useApp((s) => s.settings.ambient.volume);
  useEffect(() => {
    if (track && track !== 'none') ambient.play(track as AmbientId, volume);
    else ambient.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);
  useEffect(() => {
    ambient.setVolume(volume);
  }, [volume]);
}

const TICK_MS = 5000;

export function useMascotMood(): MascotMood {
  const mood = useApp((s) => s.mood);
  const moodSince = useApp((s) => s.moodSince);
  const lastInteraction = useApp((s) => s.lastInteraction);
  const [, force] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => force((x) => x + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const now = Date.now();
  if (mood !== 'idle' && now - moodSince < 9000) return mood;
  if (now - lastInteraction > 4 * 60_000) return 'sleep';
  return 'idle';
}

const MOOD_LINES: Record<MascotMood, string[]> = {
  idle: [
    'hi hi! ready to make today cozy? 🌸',
    'i tidied your study desk hehe~ ✨',
    'pick a cute playlist and let’s go! 🎧',
  ],
  cheer: ['yaaay! you’re doing amazing!! 🎉', 'look at you go!! so proud~ 💖', 'one step closer, superstar! ⭐'],
  study: ['shhh… deep focus mode 🍅', 'you’ve got this, i’ll keep quiet~ 🤫', 'pawsitive thinking! 🐾'],
  sleep: ['zzz… wake me when you study… 💤', 'mhm… snooze time… 😴', 'dreaming of pastel clouds… ☁️'],
  sad: ['it’s okay to rest a little 💗', 'bad day? tomorrow will be softer 🌙', 'i’m right here with you 🤍'],
  love: ['you’re my favorite study human 💕', 'group hug!! 🫂', 'sending you heart paws 🐾💗'],
  think: ['hmm… let’s plan something cute 📝', 'brainstorm mode: on 🐾', 'take your time, no rush~ 🌿'],
};

export function mascotLine(mood: MascotMood): string {
  const lines = MOOD_LINES[mood];
  return lines[Math.floor(Math.random() * lines.length)];
}

export function useNow(intervalMs = 30000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useHashRoute(): [string, (to: string) => void] {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || '/');
  useEffect(() => {
    const onChange = () => setHash(window.location.hash.slice(1) || '/');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = (to: string) => {
    window.location.hash = to;
    useApp.getState().touch();
  };
  return [hash, navigate];
}

// ===== V3: focus guard =====

export interface GuardHit {
  app: string;
  title: string;
  at: number;
}

function isBlockedHit(hit: GuardHit, blockedApps: string[], blockedSites: string[]): boolean {
  const proc = hit.app.toLowerCase().replace(/\.exe$/, '');
  if (blockedApps.some((a) => a && proc.includes(a.toLowerCase()))) return true;
  const title = hit.title.toLowerCase();
  if (blockedSites.some((s) => s && title.includes(s.toLowerCase().replace(/^www\./, '')))) return true;
  return false;
}

export function useFocusGuard(): {
  enabled: boolean;
  hit: GuardHit | null;
  banner: boolean;
  shield: boolean;
  violations: number;
  dismiss: () => void;
} {
  const guardActive = useApp((s) => s.guardActive);
  const guard = useApp((s) => s.settings.guard);
  const [hit, setHit] = useState<GuardHit | null>(null);
  const [banner, setBanner] = useState(false);
  const [shield, setShield] = useState(false);
  const [violations, setViolations] = useState(0);
  const lastKey = useRef('');
  const lastAt = useRef(0);

  const dismiss = () => {
    setBanner(false);
    setShield(false);
    setHit(null);
  };

  const enabled = guardActive && guard.enabled && guard.mode !== 'off';

  useEffect(() => {
    if (!enabled) {
      setHit(null);
      setBanner(false);
      setShield(false);
      lastKey.current = '';
      return;
    }
    const onHit = (info: GuardHit) => {
      if (!isBlockedHit(info, guard.blockedApps, guard.blockedSites)) return;
      const key = `${info.app}|${info.title}`;
      if (key === lastKey.current && Date.now() - lastAt.current < 8000) return;
      lastKey.current = key;
      lastAt.current = Date.now();
      setHit({ ...info, at: Date.now() });
      setViolations((v) => v + 1);
      if (guard.mode === 'shield') setShield(true);
      else setBanner(true);
      notifyUser('Focus guard 🛡️', `“${info.app}” is on your block list — you got this!`);
      if (guard.mode === 'snap') getBridge()?.guardNudge();
      window.setTimeout(() => setBanner((b) => (guard.mode === 'shield' ? b : false)), 6000);
    };

    const bridge = getBridge();
    if (bridge) {
      bridge.guardSetActive(true, { apps: guard.blockedApps, sites: guard.blockedSites });
      const off = bridge.onGuardForeground((info) =>
        onHit({ app: info.process, title: info.title, at: info.at }),
      );
      return () => {
        off();
        bridge.guardSetActive(false, { apps: [], sites: [] });
      };
    }
    const onBlur = () =>
      onHit({ app: 'another window', title: 'You switched away from Cutepad', at: Date.now() });
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, guard.mode, guard.blockedApps.join(','), guard.blockedSites.join(',')]);

  return { enabled, hit, banner, shield, violations, dismiss };
}

// ===== V3: voice-to-text note capture =====

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function getRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

export function useDictation(onText: (text: string) => void): { supported: boolean; listening: boolean; toggle: () => void } {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => getRecognition() !== null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(
    () => () => {
      recRef.current?.abort();
    },
    [],
  );

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = getRecognition();
    if (!rec) return;
    recRef.current = rec;
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (event) => {
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) onText(result[0].transcript);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    setListening(true);
  };

  return { supported, listening, toggle };
}
