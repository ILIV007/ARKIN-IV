"use client";

/**
 * ARKIN-IV Chiptune Engine — Web Audio API.
 * All sounds are synthesized on the fly (no external assets).
 * Lazy-initializes the AudioContext on first user gesture.
 */

type WaveType = OscillatorType;

interface Note {
  freq: number;
  dur: number; // seconds
  wave?: WaveType;
  gain?: number; // 0..1 relative
  slideTo?: number; // frequency slide target
  delay?: number; // start offset seconds
}

export type SfxName =
  | "beep"
  | "select"
  | "confirm"
  | "back"
  | "move"
  | "rotate"
  | "eat"
  | "coin"
  | "power"
  | "die"
  | "hit"
  | "drop"
  | "clearLine"
  | "levelup"
  | "achieve"
  | "pause"
  | "boot";

const SFX: Record<SfxName, Note[]> = {
  beep: [{ freq: 880, dur: 0.06, wave: "square", gain: 0.16 }],
  select: [{ freq: 520, dur: 0.05, wave: "square", gain: 0.14 }],
  confirm: [
    { freq: 660, dur: 0.07, wave: "square", gain: 0.15 },
    { freq: 990, dur: 0.09, wave: "square", gain: 0.15, delay: 0.07 },
  ],
  back: [
    { freq: 440, dur: 0.06, wave: "square", gain: 0.13 },
    { freq: 300, dur: 0.08, wave: "square", gain: 0.13, delay: 0.06 },
  ],
  move: [{ freq: 220, dur: 0.03, wave: "square", gain: 0.08 }],
  rotate: [{ freq: 620, dur: 0.05, wave: "triangle", gain: 0.13, slideTo: 880 }],
  eat: [
    { freq: 660, dur: 0.05, wave: "square", gain: 0.16 },
    { freq: 990, dur: 0.07, wave: "square", gain: 0.16, delay: 0.05 },
  ],
  coin: [
    { freq: 988, dur: 0.06, wave: "square", gain: 0.16 },
    { freq: 1319, dur: 0.16, wave: "square", gain: 0.16, delay: 0.06 },
  ],
  power: [
    { freq: 262, dur: 0.09, wave: "square", gain: 0.15 },
    { freq: 392, dur: 0.09, wave: "square", gain: 0.15, delay: 0.09 },
    { freq: 523, dur: 0.09, wave: "square", gain: 0.15, delay: 0.18 },
    { freq: 784, dur: 0.18, wave: "square", gain: 0.15, delay: 0.27 },
  ],
  die: [
    { freq: 440, dur: 0.1, wave: "sawtooth", gain: 0.16, slideTo: 220 },
    { freq: 220, dur: 0.22, wave: "sawtooth", gain: 0.16, delay: 0.1, slideTo: 60 },
  ],
  hit: [{ freq: 160, dur: 0.07, wave: "sawtooth", gain: 0.15, slideTo: 90 }],
  drop: [{ freq: 140, dur: 0.08, wave: "square", gain: 0.18, slideTo: 70 }],
  clearLine: [
    { freq: 523, dur: 0.07, wave: "square", gain: 0.15 },
    { freq: 659, dur: 0.07, wave: "square", gain: 0.15, delay: 0.07 },
    { freq: 784, dur: 0.12, wave: "square", gain: 0.15, delay: 0.14 },
  ],
  levelup: [
    { freq: 392, dur: 0.08, wave: "square", gain: 0.15 },
    { freq: 523, dur: 0.08, wave: "square", gain: 0.15, delay: 0.08 },
    { freq: 659, dur: 0.08, wave: "square", gain: 0.15, delay: 0.16 },
    { freq: 1047, dur: 0.2, wave: "square", gain: 0.15, delay: 0.24 },
  ],
  achieve: [
    { freq: 784, dur: 0.09, wave: "triangle", gain: 0.17 },
    { freq: 988, dur: 0.09, wave: "triangle", gain: 0.17, delay: 0.09 },
    { freq: 1319, dur: 0.22, wave: "triangle", gain: 0.17, delay: 0.18 },
  ],
  pause: [
    { freq: 520, dur: 0.06, wave: "triangle", gain: 0.12 },
    { freq: 360, dur: 0.08, wave: "triangle", gain: 0.12, delay: 0.06 },
  ],
  boot: [
    { freq: 262, dur: 0.1, wave: "square", gain: 0.13 },
    { freq: 330, dur: 0.1, wave: "square", gain: 0.13, delay: 0.11 },
    { freq: 392, dur: 0.1, wave: "square", gain: 0.13, delay: 0.22 },
    { freq: 523, dur: 0.24, wave: "square", gain: 0.14, delay: 0.33 },
  ],
};

class ChiptuneEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private volume = 0.5;

  private ensureCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  unlock() {
    this.ensureCtx();
  }

  setEnabled(v: boolean) {
    this.enabled = v;
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  }

  play(name: SfxName) {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const notes = SFX[name];
    if (!notes) return;
    const now = ctx.currentTime;
    for (const n of notes) {
      const start = now + (n.delay ?? 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.wave ?? "square";
      osc.frequency.setValueAtTime(n.freq, start);
      if (n.slideTo) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(1, n.slideTo),
          start + n.dur
        );
      }
      const g = (n.gain ?? 0.15) * 0.9;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(g, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(start);
      osc.stop(start + n.dur + 0.02);
    }
  }
}

export const chiptune = new ChiptuneEngine();

export function playSfx(name: SfxName) {
  chiptune.play(name);
}

export function setSoundEnabled(v: boolean) {
  chiptune.setEnabled(v);
}

export function setSoundVolume(v: number) {
  chiptune.setVolume(v);
}

export function unlockAudio() {
  chiptune.unlock();
}
