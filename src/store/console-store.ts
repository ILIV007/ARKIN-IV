"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setSoundEnabled, setSoundVolume } from "@/lib/audio/chiptune";

export type ArkTheme =
  | "neon-night"
  | "pure-white"
  | "phosphor-green"
  | "amber-crt";

export type CrtIntensity = "off" | "low" | "high";
export type Language = "en";

interface ConsoleState {
  theme: ArkTheme;
  crtIntensity: CrtIntensity;
  scanlines: boolean;
  flicker: boolean;
  soundOn: boolean;
  volume: number;
  language: Language;
  konamiUnlocked: boolean;
  bootSeen: boolean;
  setTheme: (t: ArkTheme) => void;
  setCrtIntensity: (v: CrtIntensity) => void;
  setScanlines: (v: boolean) => void;
  setFlicker: (v: boolean) => void;
  setSoundOn: (v: boolean) => void;
  setVolume: (v: number) => void;
  setLanguage: (l: Language) => void;
  unlockKonami: () => void;
  markBootSeen: () => void;
}

export const useConsoleStore = create<ConsoleState>()(
  persist(
    (set) => ({
      theme: "neon-night",
      crtIntensity: "high",
      scanlines: true,
      flicker: true,
      soundOn: true,
      volume: 0.5,
      language: "en",
      konamiUnlocked: false,
      bootSeen: false,
      setTheme: (t) => set({ theme: t }),
      setCrtIntensity: (v) => set({ crtIntensity: v }),
      setScanlines: (v) => set({ scanlines: v }),
      setFlicker: (v) => set({ flicker: v }),
      setSoundOn: (v) => {
        setSoundEnabled(v);
        set({ soundOn: v });
      },
      setVolume: (v) => {
        setSoundVolume(v);
        set({ volume: v });
      },
      setLanguage: (l) => set({ language: l }),
      unlockKonami: () => set({ konamiUnlocked: true }),
      markBootSeen: () => set({ bootSeen: true }),
    }),
    {
      name: "arkin4.console.v1",
    }
  )
);
