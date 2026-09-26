"use client";

import { useConsoleStore, type ArkTheme, type CrtIntensity } from "@/store/console-store";
import { navigate } from "@/lib/router";
import { playSfx, setSoundVolume } from "@/lib/audio/chiptune";
import { unlockAchievement, getUnlockedIds } from "@/lib/storage/achievements";
import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";

const THEMES: { id: ArkTheme; label: string; swatch: string[] }[] = [
  { id: "neon-night", label: "NEON NIGHT", swatch: ["#0b0f1a", "#b026ff", "#22d3ee"] },
  { id: "pure-white", label: "PURE WHITE", swatch: ["#eef0f7", "#7c3aed", "#0891b2"] },
  { id: "phosphor-green", label: "PHOSPHOR GREEN", swatch: ["#050a06", "#52ff7a", "#8affaa"] },
  { id: "amber-crt", label: "AMBER CRT", swatch: ["#0d0802", "#ff9500", "#ffd27a"] },
];

const CRT_LEVELS: CrtIntensity[] = ["off", "low", "high"];

export function SettingsPage() {
  const t = useT();
  const s = useConsoleStore();
  const [visitedThemes, setVisitedThemes] = useState<string[]>([]);

  useEffect(() => {
    const unlocked = getUnlockedIds();
    void unlocked;
  }, []);

  const applyTheme = (id: ArkTheme) => {
    playSfx("confirm");
    s.setTheme(id);
    setVisitedThemes((prev) => {
      const next = [...new Set([...prev, id])];
      // "Mood Swinger" — tried every theme
      if (next.length >= THEMES.length) unlockAchievement("theme_switcher");
      return next;
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 flex items-center justify-between px-3 sm:px-6 py-3 border-b-2 ark-bc">
        <div className="font-pixel text-[11px] sm:text-sm ark-accent text-glow">
          {t.settings.title}
        </div>
        <button
          onClick={() => {
            playSfx("back");
            navigate("/");
          }}
          className="font-pixel text-[8px] px-3 py-2 border-2 ark-bc ark-dim hover:ark-ba hover:ark-accent rounded-sm transition-colors no-touch-highlight"
        >
          ◂ TERMINAL
        </button>
      </div>

      <div className="flex-1 overflow-y-auto ark-scroll px-3 sm:px-6 py-5">
        <div className="max-w-lg mx-auto flex flex-col gap-6">
          {/* Themes */}
          <section className="flex flex-col gap-2">
            <h2 className="font-pixel text-[9px] ark-dim">{t.settings.theme}</h2>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  onClick={() => applyTheme(th.id)}
                  className={[
                    "flex items-center gap-2 p-3 border-2 rounded-sm transition-all active:scale-95 no-touch-highlight",
                    s.theme === th.id ? "" : "opacity-75 hover:opacity-100",
                  ].join(" ")}
                  style={{
                    borderColor: s.theme === th.id ? "var(--ark-accent)" : "var(--ark-border)",
                    background: "var(--ark-panel)",
                  }}
                  aria-pressed={s.theme === th.id}
                >
                  <span className="flex gap-1">
                    {th.swatch.map((c) => (
                      <span
                        key={c}
                        className="h-5 w-5 rounded-sm border border-black/40"
                        style={{ background: c }}
                      />
                    ))}
                  </span>
                  <span className="font-pixel text-[7px] sm:text-[8px] text-left" style={{ color: "var(--ark-text)" }}>
                    {th.label}
                    {s.theme === th.id && (
                      <span className="block mt-1" style={{ color: "var(--ark-ok)" }}>
                        ● ACTIVE
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* CRT */}
          <section className="flex flex-col gap-2">
            <h2 className="font-pixel text-[9px] ark-dim">{t.settings.crt}</h2>
            <div className="flex gap-1.5">
              {CRT_LEVELS.map((lv) => (
                <button
                  key={lv}
                  onClick={() => {
                    playSfx("select");
                    s.setCrtIntensity(lv);
                  }}
                  className="flex-1 font-pixel text-[9px] py-2.5 border-2 rounded-sm active:scale-95 transition-all no-touch-highlight"
                  style={{
                    color: s.crtIntensity === lv ? "var(--ark-accent)" : "var(--ark-dim)",
                    borderColor: s.crtIntensity === lv ? "var(--ark-accent)" : "var(--ark-border)",
                  }}
                  aria-pressed={s.crtIntensity === lv}
                >
                  {lv.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 font-term text-lg ark-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={s.scanlines}
                  onChange={(e) => s.setScanlines(e.target.checked)}
                  className="accent-[var(--ark-accent)] h-4 w-4"
                />
                {t.settings.scanlines}
              </label>
              <label className="flex items-center gap-2 font-term text-lg ark-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={s.flicker}
                  onChange={(e) => s.setFlicker(e.target.checked)}
                  className="accent-[var(--ark-accent)] h-4 w-4"
                />
                {t.settings.flicker}
              </label>
            </div>
          </section>

          {/* Sound */}
          <section className="flex flex-col gap-2">
            <h2 className="font-pixel text-[9px] ark-dim">{t.settings.volume}</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  s.setSoundOn(!s.soundOn);
                  playSfx("confirm");
                }}
                className="font-pixel text-[9px] px-3 py-2 border-2 rounded-sm no-touch-highlight"
                style={{
                  color: s.soundOn ? "var(--ark-ok)" : "var(--ark-dim)",
                  borderColor: s.soundOn ? "var(--ark-ok)" : "var(--ark-border)",
                }}
              >
                {s.soundOn ? "🔊 ON" : "🔇 OFF"}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(s.volume * 100)}
                onChange={(e) => {
                  const v = Number(e.target.value) / 100;
                  setSoundVolume(v);
                  s.setVolume(v);
                }}
                className="flex-1 accent-[var(--ark-accent)]"
                aria-label="Volume"
              />
              <span className="font-term text-base ark-dim w-10 text-right">
                {Math.round(s.volume * 100)}%
              </span>
            </div>
          </section>

          {/* Language */}
          <section className="flex flex-col gap-2">
            <h2 className="font-pixel text-[9px] ark-dim">{t.settings.language}</h2>
            <div className="flex gap-1.5">
              <span className="font-pixel text-[9px] px-3 py-2 border-2 rounded-sm" style={{ color: "var(--ark-ok)", borderColor: "var(--ark-ok)" }}>
                ENGLISH ●
              </span>
              <span className="font-pixel text-[9px] px-3 py-2 border-2 rounded-sm opacity-50" style={{ color: "var(--ark-dim)", borderColor: "var(--ark-border)" }}>
                فارسی — {t.settings.comingSoon}
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
