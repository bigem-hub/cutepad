let cachedVoices: SpeechSynthesisVoice[] = [];

function synth(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  return window.speechSynthesis;
}

export function ttsAvailable(): boolean {
  return synth() !== null;
}

export function ttsVoices(): SpeechSynthesisVoice[] {
  const s = synth();
  if (!s) return [];
  if (cachedVoices.length === 0) cachedVoices = s.getVoices();
  return cachedVoices;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    cachedVoices = window.speechSynthesis.getVoices();
  });
}

export interface SpeakOptions {
  voiceURI?: string;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
  onError?: () => void;
}

export function speak(text: string, opts: SpeakOptions = {}): boolean {
  const s = synth();
  if (!s || !text.trim()) return false;
  s.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voices = ttsVoices();
  const chosen = opts.voiceURI ? voices.find((v) => v.voiceURI === opts.voiceURI) : undefined;
  if (chosen) utter.voice = chosen;
  utter.rate = Math.min(3, Math.max(0.5, opts.rate ?? 1));
  utter.pitch = Math.min(2, Math.max(0.5, opts.pitch ?? 1));
  if (opts.onEnd) utter.onend = opts.onEnd;
  if (opts.onError) utter.onerror = opts.onError;
  s.speak(utter);
  return true;
}

export function stopSpeaking(): void {
  synth()?.cancel();
}

export function speaking(): boolean {
  return synth()?.speaking === true;
}
