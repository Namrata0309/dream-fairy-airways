/**
 * Procedural soft dreamy felt-piano engine + locally synthesized WAV audio loop.
 * Starts only after explicit user interaction (zero autoplay with sound).
 */

interface PianoNote {
  step: number;
  freq: number;
  duration: number;
  velocity: number;
}

// Gentle Fmaj7 -> Dm9 -> Bbmaj7 -> C6sus4 dreamy felt-piano progression
const MELODY_NOTES: PianoNote[] = [
  // Bar 1 (Fmaj7)
  { step: 0, freq: 174.61, duration: 2.2, velocity: 0.42 }, // F3
  { step: 1, freq: 261.63, duration: 1.6, velocity: 0.34 }, // C4
  { step: 2, freq: 329.63, duration: 1.8, velocity: 0.40 }, // E4
  { step: 3, freq: 440.0, duration: 2.0, velocity: 0.46 },  // A4
  { step: 4, freq: 523.25, duration: 1.8, velocity: 0.44 }, // C5
  { step: 6, freq: 659.25, duration: 2.2, velocity: 0.38 }, // E5

  // Bar 2 (Dm9)
  { step: 8, freq: 146.83, duration: 2.2, velocity: 0.40 }, // D3
  { step: 9, freq: 220.0, duration: 1.6, velocity: 0.33 },  // A3
  { step: 10, freq: 329.63, duration: 1.8, velocity: 0.38 }, // E4
  { step: 11, freq: 349.23, duration: 1.8, velocity: 0.42 }, // F4
  { step: 12, freq: 440.0, duration: 1.9, velocity: 0.44 },  // A4
  { step: 14, freq: 587.33, duration: 2.0, velocity: 0.36 }, // D5

  // Bar 3 (Bbmaj7)
  { step: 16, freq: 116.54, duration: 2.2, velocity: 0.40 }, // Bb2
  { step: 17, freq: 233.08, duration: 1.6, velocity: 0.32 }, // Bb3
  { step: 18, freq: 293.66, duration: 1.8, velocity: 0.38 }, // D4
  { step: 19, freq: 349.23, duration: 1.8, velocity: 0.42 }, // F4
  { step: 20, freq: 440.0, duration: 2.0, velocity: 0.46 },  // A4
  { step: 22, freq: 523.25, duration: 2.2, velocity: 0.38 }, // C5

  // Bar 4 (C6 / Csus4)
  { step: 24, freq: 130.81, duration: 2.2, velocity: 0.40 }, // C3
  { step: 25, freq: 261.63, duration: 1.6, velocity: 0.34 }, // C4
  { step: 26, freq: 349.23, duration: 1.8, velocity: 0.36 }, // F4
  { step: 27, freq: 392.0, duration: 1.8, velocity: 0.40 },  // G4
  { step: 28, freq: 440.0, duration: 2.0, velocity: 0.44 },  // A4
  { step: 30, freq: 587.33, duration: 2.1, velocity: 0.36 }, // D5
];

function createImpulseResponse(ctx: AudioContext, seconds = 2.6, decay = 2.4): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const channelData = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const env = Math.pow(1 - i / length, decay);
      channelData[i] = (Math.random() * 2 - 1) * env * 0.45;
    }
  }
  return impulse;
}

class DreamPianoEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private schedulerId: number | null = null;
  private currentStep = 0;
  private nextNoteTime = 0;
  private isPlaying = false;
  private listeners = new Set<(playing: boolean) => void>();

  private stepDuration = 0.46; // Soft, unhurried ~65 BPM feel

  subscribe(listener: (playing: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.isPlaying);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.isPlaying));
  }

  getPlaying(): boolean {
    return this.isPlaying;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.0001;

      this.convolver = this.ctx.createConvolver();
      this.convolver.buffer = createImpulseResponse(this.ctx);

      const wetGain = this.ctx.createGain();
      wetGain.gain.value = 0.42;

      const dryGain = this.ctx.createGain();
      dryGain.gain.value = 0.72;

      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 2600;
      lowpass.Q.value = 0.7;

      lowpass.connect(dryGain);
      lowpass.connect(this.convolver);
      this.convolver.connect(wetGain);

      dryGain.connect(this.masterGain);
      wetGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      (this as unknown as { inputNode: AudioNode }).inputNode = lowpass;
    }
    return this.ctx;
  }

  private triggerPianoNote(freq: number, time: number, duration: number, velocity: number) {
    const ctx = this.ctx;
    const inputNode = (this as unknown as { inputNode?: AudioNode }).inputNode;
    if (!ctx || !inputNode) return;

    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0.0001, time);
    noteGain.gain.linearRampToValueAtTime(velocity * 0.28, time + 0.025);
    noteGain.gain.exponentialRampToValueAtTime(velocity * 0.11, time + 0.35);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    // Warm felt-piano fundamental + soft 2nd & 3rd harmonics
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, time);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, time);

    const harmGain = ctx.createGain();
    harmGain.gain.setValueAtTime(0.18, time);
    harmGain.gain.exponentialRampToValueAtTime(0.02, time + 0.5);

    osc1.connect(noteGain);
    osc2.connect(harmGain);
    harmGain.connect(noteGain);
    noteGain.connect(inputNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.08);
    osc2.stop(time + duration + 0.08);
  }

  private scheduleAhead = () => {
    if (!this.ctx || !this.isPlaying) return;
    while (this.nextNoteTime < this.ctx.currentTime + 0.25) {
      const stepIndex = this.currentStep % 32;
      for (const note of MELODY_NOTES) {
        if (note.step === stepIndex) {
          this.triggerPianoNote(note.freq, this.nextNoteTime, note.duration, note.velocity);
        }
      }
      this.nextNoteTime += this.stepDuration;
      this.currentStep = (this.currentStep + 1) % 32;
    }
  };

  async start(): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.nextNoteTime = ctx.currentTime + 0.06;
    this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
    this.masterGain.gain.setValueAtTime(Math.max(this.masterGain.gain.value, 0.0001), ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 1.2);

    this.schedulerId = window.setInterval(this.scheduleAhead, 80);
    this.notify();
  }

  pause(): void {
    if (!this.ctx || !this.masterGain || !this.isPlaying) return;
    this.isPlaying = false;
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.45);
    this.notify();
  }

  async toggle(): Promise<boolean> {
    if (this.isPlaying) {
      this.pause();
      return false;
    }
    await this.start();
    return true;
  }

  playChime(kind: 'boarding' | 'takeoff' | 'envelope' = 'boarding'): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const now = ctx.currentTime + 0.02;
    const notes =
      kind === 'takeoff'
        ? [523.25, 659.25, 783.99, 1046.5]
        : kind === 'envelope'
          ? [659.25, 880.0, 1046.5]
          : [523.25, 659.25, 783.99];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.11);
      gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.11 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.11 + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.95);
    });
  }
}

export const dreamPiano = new DreamPianoEngine();
