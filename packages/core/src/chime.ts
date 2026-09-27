type AudioContextCtor = typeof AudioContext;

let sharedCtx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  try {
    const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;
    if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new Ctor();
    if (sharedCtx.state === 'suspended') void sharedCtx.resume();
    return sharedCtx;
  } catch {
    return null;
  }
}

function note(ctx: AudioContext, freq: number, at: number, dur: number, vol: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

/** Soft two-note ding (pomodoro "chime when done"). */
export function playChime(): void {
  const ctx = audioCtx();
  if (!ctx) return;
  const start = ctx.currentTime;
  note(ctx, 660, start, 0.4, 0.2);
  note(ctx, 880, start + 0.16, 0.4, 0.2);
}

/** Brighter two-tone pager used for deadline & reminder alarms. */
export function playAlarm(): void {
  const ctx = audioCtx();
  if (!ctx) return;
  const start = ctx.currentTime;
  const seq: Array<[number, number, number]> = [
    [988, 0, 0.16],
    [784, 0.2, 0.16],
    [988, 0.4, 0.16],
    [784, 0.6, 0.16],
    [1046.5, 0.9, 0.34],
  ];
  for (const [freq, offset, dur] of seq) note(ctx, freq, start + offset, dur, 0.18);
}
