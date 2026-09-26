export type AmbientId = 'none' | 'rain' | 'ocean' | 'cafe' | 'fire' | 'lofi' | 'beats';

export const AMBIENT_TRACKS: { id: AmbientId; name: string; emoji: string }[] = [
  { id: 'none', name: 'Silence', emoji: '🔇' },
  { id: 'rain', name: 'Rainy Day', emoji: '🌧️' },
  { id: 'ocean', name: 'Ocean Waves', emoji: '🌊' },
  { id: 'cafe', name: 'Cozy Café', emoji: '☕' },
  { id: 'fire', name: 'Campfire', emoji: '🔥' },
  { id: 'lofi', name: 'Lo-fi Study', emoji: '🎧' },
  { id: 'beats', name: 'Lo-fi Beats', emoji: '🥁' },
];

type NoiseKind = 'white' | 'brown' | 'pink';

function makeNoise(ctx: AudioContext, kind: NoiseKind): AudioBuffer {
  const length = ctx.sampleRate * 3;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (kind === 'white') {
      data[i] = white * 0.6;
    } else if (kind === 'brown') {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.11;
    }
  }
  return buffer;
}

class AmbientPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sources: AudioBufferSourceNode[] = [];
  private oscillators: OscillatorNode[] = [];
  private timers: number[] = [];
  private current: AmbientId = 'none';
  private volume = 0.5;
  private chordTimer: number | null = null;

  get playing(): AmbientId {
    return this.current;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctor: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private noiseSource(ctx: AudioContext, kind: NoiseKind): AudioBufferSourceNode {
    const src = ctx.createBufferSource();
    src.buffer = makeNoise(ctx, kind);
    src.loop = true;
    src.start();
    this.sources.push(src);
    return src;
  }

  private trackGain(ctx: AudioContext, level: number): GainNode {
    const g = ctx.createGain();
    g.gain.value = level;
    g.connect(this.master!);
    return g;
  }

  private filter(ctx: AudioContext, type: BiquadFilterType, freq: number, q = 1): BiquadFilterNode {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  play(id: AmbientId, volume = this.volume): void {
    if (id === 'none') {
      this.stop();
      return;
    }
    if (id === this.current && this.ctx) {
      this.setVolume(volume);
      return;
    }
    this.stopNodes();
    this.current = id;
    this.volume = volume;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    if (id === 'rain') {
      const src = this.noiseSource(ctx, 'white');
      const lp = this.filter(ctx, 'lowpass', 1500, 0.7);
      const hp = this.filter(ctx, 'highpass', 400, 0.6);
      const g = this.trackGain(ctx, 0.35);
      src.connect(hp).connect(lp).connect(g);
    } else if (id === 'ocean') {
      const src = this.noiseSource(ctx, 'brown');
      const lp = this.filter(ctx, 'lowpass', 600, 0.8);
      const g = this.trackGain(ctx, 0.5);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.09;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.28;
      lfo.connect(lfoGain).connect(g.gain);
      lfo.start();
      this.oscillators.push(lfo);
      src.connect(lp).connect(g);
    } else if (id === 'cafe') {
      const src = this.noiseSource(ctx, 'brown');
      const lp = this.filter(ctx, 'lowpass', 750, 0.7);
      const g = this.trackGain(ctx, 0.28);
      src.connect(lp).connect(g);
      this.scheduleRandom(() => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = 1400 + Math.random() * 900;
        const eg = this.ctx.createGain();
        eg.gain.setValueAtTime(0.0001, t);
        eg.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
        eg.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        osc.connect(eg).connect(this.master!);
        osc.start(t);
        osc.stop(t + 0.3);
      }, 2500, 7000);
    } else if (id === 'fire') {
      const src = this.noiseSource(ctx, 'brown');
      const lp = this.filter(ctx, 'lowpass', 420, 0.7);
      const g = this.trackGain(ctx, 0.4);
      src.connect(lp).connect(g);
      this.scheduleRandom(() => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const pop = this.ctx.createBufferSource();
        pop.buffer = makeNoise(this.ctx, 'white');
        const bp = this.filter(this.ctx, 'bandpass', 1800 + Math.random() * 2200, 6);
        const eg = this.ctx.createGain();
        eg.gain.setValueAtTime(0.0001, t);
        eg.gain.exponentialRampToValueAtTime(0.16, t + 0.005);
        eg.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        pop.connect(bp).connect(eg).connect(this.master!);
        pop.start(t);
        pop.stop(t + 0.1);
      }, 250, 1400);
    } else if (id === 'lofi') {
      const crackle = this.noiseSource(ctx, 'pink');
      const hp = this.filter(ctx, 'highpass', 2400, 0.7);
      const g = this.trackGain(ctx, 0.06);
      crackle.connect(hp).connect(g);
      const chords = [
        [220.0, 261.63, 329.63, 392.0],
        [174.61, 220.0, 261.63, 329.63],
        [130.81, 164.81, 196.0, 261.63],
        [196.0, 246.94, 293.66, 392.0],
      ];
      let step = 0;
      const playChord = () => {
        if (!this.ctx || this.current !== 'lofi') return;
        const t = this.ctx.currentTime;
        const chord = chords[step % chords.length];
        step++;
        for (const freq of chord) {
          const osc = this.ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          const lp = this.filter(this.ctx, 'lowpass', 900, 0.6);
          const eg = this.ctx.createGain();
          eg.gain.setValueAtTime(0.0001, t);
          eg.gain.linearRampToValueAtTime(0.05, t + 0.6);
          eg.gain.setValueAtTime(0.05, t + 2.4);
          eg.gain.linearRampToValueAtTime(0.0001, t + 3.4);
          osc.connect(lp).connect(eg).connect(this.master!);
          osc.start(t);
          osc.stop(t + 3.5);
          this.oscillators.push(osc);
        }
      };
      playChord();
      this.chordTimer = window.setInterval(playChord, 3400);
    } else if (id === 'beats') {
      const crackle = this.noiseSource(ctx, 'pink');
      const hp = this.filter(ctx, 'highpass', 2600, 0.7);
      const g = this.trackGain(ctx, 0.035);
      crackle.connect(hp).connect(g);

      const beatCtx = () => this.ctx;
      const hit = (freqFrom: number, freqTo: number, dur: number, level: number) => {
        const c = beatCtx();
        if (!c) return;
        const t = c.currentTime;
        const osc = c.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqFrom, t);
        osc.frequency.exponentialRampToValueAtTime(freqTo, t + dur * 0.8);
        const eg = c.createGain();
        eg.gain.setValueAtTime(level, t);
        eg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(eg).connect(this.master!);
        osc.start(t);
        osc.stop(t + dur + 0.02);
        this.oscillators.push(osc);
      };
      const noiseHit = (freq: number, q: number, dur: number, level: number) => {
        const c = beatCtx();
        if (!c) return;
        const t = c.currentTime;
        const src = c.createBufferSource();
        src.buffer = makeNoise(c, 'white');
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = freq;
        bp.Q.value = q;
        const eg = c.createGain();
        eg.gain.setValueAtTime(level, t);
        eg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(bp).connect(eg).connect(this.master!);
        src.start(t);
        src.stop(t + dur + 0.02);
        this.sources.push(src);
      };
      const barChords = [
        [220.0, 261.63, 329.63, 415.3],
        [174.61, 220.0, 261.63, 329.63],
        [196.0, 246.94, 293.66, 349.23],
        [164.81, 207.65, 246.94, 311.13],
      ];
      const stepDurMs = (60 / 84 / 4) * 1000;
      const KICK = [0, 7, 10];
      const SNARE = [4, 12];
      const HAT = [0, 2, 4, 6, 8, 10, 12, 14];
      let step = 0;
      const seq = window.setInterval(() => {
        if (!this.ctx || this.current !== 'beats') return;
        if (KICK.includes(step % 16)) hit(140, 48, 0.16, 0.42);
        if (SNARE.includes(step % 16)) noiseHit(1750, 1.2, 0.09, 0.16);
        if (HAT.includes(step % 16)) noiseHit(7200, 2.5, 0.03, step % 4 === 0 ? 0.07 : 0.045);
        if (step % 16 === 0) {
          const chord = barChords[Math.floor(step / 16) % barChords.length];
          const c = this.ctx;
          const t = c.currentTime;
          for (const freq of chord) {
            const osc = c.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            const lp = this.filter(c, 'lowpass', 850, 0.7);
            const eg = c.createGain();
            eg.gain.setValueAtTime(0.0001, t);
            eg.gain.linearRampToValueAtTime(0.03, t + 0.08);
            eg.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
            osc.connect(lp).connect(eg).connect(this.master!);
            osc.start(t);
            osc.stop(t + 1.35);
            this.oscillators.push(osc);
          }
        }
        step++;
      }, stepDurMs);
      this.timers.push(seq);
    }

    this.master!.gain.cancelScheduledValues(now);
    this.master!.gain.setValueAtTime(this.master!.gain.value, now);
    this.master!.gain.linearRampToValueAtTime(this.volume, now + 1.2);
  }

  private scheduleRandom(fn: () => void, minMs: number, maxMs: number): void {
    const loop = () => {
      const delay = minMs + Math.random() * (maxMs - minMs);
      const timer = window.setTimeout(() => {
        fn();
        if (this.current !== 'none') loop();
      }, delay);
      this.timers.push(timer);
    };
    loop();
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.ctx && this.master) {
      this.master.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 0.2);
    }
  }

  private stopNodes(): void {
    for (const src of this.sources) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        /* already stopped */
      }
    }
    for (const osc of this.oscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        /* already stopped */
      }
    }
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
    if (this.chordTimer !== null) {
      window.clearInterval(this.chordTimer);
      this.chordTimer = null;
    }
    this.sources = [];
    this.oscillators = [];
  }

  stop(): void {
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(0, now + 0.6);
    }
    const ctx = this.ctx;
    window.setTimeout(() => {
      this.stopNodes();
      if (ctx && this.current === 'none') {
        void ctx.close();
        this.ctx = null;
        this.master = null;
      }
    }, 700);
    this.current = 'none';
  }
}

export const ambient = new AmbientPlayer();
