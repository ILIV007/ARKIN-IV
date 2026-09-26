"use client";

import { useEffect, useState } from "react";
import { useConsoleStore } from "@/store/console-store";
import { applyThemeClass, recordThemeUse } from "@/lib/theme";
import { playSfx } from "@/lib/audio/chiptune";
import { setSoundEnabled, setSoundVolume } from "@/lib/audio/chiptune";
import { useT } from "@/lib/i18n";
import { clearHighScores } from "@/lib/storage/highscores";
import type { ArkTheme, CrtIntensity } from "@/store/console-store";

export function SettingsPage() {
  const t = useT();
  const s = useConsoleStore();

  // hydrate sound engine with stored prefs on mount
  useEffect(() => {
    setSoundEnabled(s.soundOn);
    setSoundVolume(s.volume);
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 text-center">
        <h1 className="font-pixel text-sm sm:text-lg">
          <span className="ark-text">SYSTEM </span>
          <span style={{ color: "var(--neon-soft)", textShadow: "0 0 20px var(--neon-glow)" }}>
            SETTINGS
          </span>
        </h1>
        <p className="mt-3 text-sm ark-dim sm:text-base">{t.settings.sub}</p>
      </header>

      <div className="flex flex-col gap-4">
        {/* DISPLAY */}
        <Panel title={t.settings.display} icon="🖥️">
          <Row label={t.settings.theme}>
            <div className="flex gap-2">
              {(["dark", "light"] as ArkTheme[]).map((th) => (
                <Option
                  key={th}
                  active={s.theme === th}
                  onClick={() => {
                    playSfx("select");
                    s.setTheme(th);
                    applyThemeClass(th);
                    recordThemeUse(th);
                  }}
                  label={t.themes[th]}
                  swatch={th === "dark" ? "#0b1122" : "#ffffff"}
                />
              ))}
            </div>
          </Row>

          <Row label={t.settings.crt}>
            <div className="flex gap-2">
              {(["off", "low", "high"] as CrtIntensity[]).map((lvl) => (
                <Option
                  key={lvl}
                  active={s.crtIntensity === lvl}
                  onClick={() => {
                    playSfx("select");
                    s.setCrtIntensity(lvl);
                  }}
                  label={
                    lvl === "off" ? t.settings.crtOff : lvl === "low" ? t.settings.crtLow : t.settings.crtHigh
                  }
                />
              ))}
            </div>
          </Row>

          <Row label={t.settings.scanlines}>
            <Toggle
              checked={s.scanlines}
              onChange={(v) => {
                playSfx("select");
                s.setScanlines(v);
              }}
            />
          </Row>

          <Row label={t.settings.flicker}>
            <Toggle
              checked={s.flicker}
              onChange={(v) => {
                playSfx("select");
                s.setFlicker(v);
              }}
            />
          </Row>
        </Panel>

        {/* SOUND */}
        <Panel title={t.settings.sound} icon="🔊">
          <Row label={t.settings.soundOn}>
            <Toggle
              checked={s.soundOn}
              onChange={(v) => {
                s.setSoundOn(v);
                if (v) playSfx("coin");
              }}
            />
          </Row>
          <Row label={t.settings.volume}>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={s.volume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  s.setVolume(v);
                  if (!s.soundOn) s.setSoundOn(true);
                }}
                className="ark-volume h-1.5 w-40 cursor-pointer appearance-none rounded-full sm:w-52"
                style={{
                  background: `linear-gradient(90deg, var(--neon) ${s.volume * 100}%, var(--border) ${s.volume * 100}%)`,
                }}
                aria-label={t.settings.volume}
              />
              <span className="w-10 text-right font-term text-sm ark-dim">
                {Math.round(s.volume * 100)}%
              </span>
            </div>
          </Row>
        </Panel>

        {/* LANGUAGE */}
        <Panel title={t.settings.language} icon="🌐">
          <Row label={t.settings.language}>
            <div className="flex gap-2">
              <Option active label="ENGLISH" onClick={() => {}} />
              <span
                className="rounded-lg border-2 px-3.5 py-2 font-pixel text-[8px] opacity-45"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                title={t.settings.comingSoon}
              >
                فارسی — {t.settings.comingSoon}
              </span>
            </div>
          </Row>
        </Panel>

        {/* DANGER */}
        <Panel title={t.settings.danger} icon="⚠️" danger>
          <Row label={t.settings.resetDesc}>
            <button
              onClick={() => {
                if (!window.confirm(`${t.settings.reset} — ${t.settings.resetDesc}?`)) return;
                clearHighScores();
                try {
                  window.localStorage.removeItem("arkin4.achievements.v1");
                  window.localStorage.removeItem("arkin4.played.v1");
                  window.localStorage.removeItem("arkin4.themesUsed.v1");
                } catch {
                  /* ignore */
                }
                playSfx("power");
                window.location.reload();
              }}
              className="btn-pixel px-4 py-3 font-pixel text-[8px]"
              style={{ color: "var(--err)", borderColor: "var(--err)" }}
            >
              ⌫ {t.settings.reset}
            </button>
          </Row>
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
  danger,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section className="surface p-5" style={danger ? { borderColor: "rgba(248,113,113,0.35)" } : undefined}>
      <h2 className="mb-4 flex items-center gap-2.5 font-pixel text-[9px]" style={{ color: danger ? "var(--err)" : "var(--dim)" }}>
        <span aria-hidden>{icon}</span>
        {title}
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm ark-dim">{label}</span>
      {children}
    </div>
  );
}

function Option({
  active,
  onClick,
  label,
  swatch,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  swatch?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border-2 px-3.5 py-2 font-pixel text-[8px] transition-all active:scale-95 no-touch-highlight"
      style={{
        color: active ? "var(--neon-soft)" : "var(--dim)",
        borderColor: active ? "var(--neon)" : "var(--border)",
        background: active ? "rgba(176,38,255,0.10)" : "transparent",
        boxShadow: active ? "0 0 14px -4px var(--neon-glow)" : "none",
      }}
      aria-pressed={active}
    >
      {swatch && (
        <span
          className="inline-block h-3.5 w-3.5 rounded-full border"
          style={{ background: swatch, borderColor: "var(--border-2)" }}
          aria-hidden
        />
      )}
      {label}
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative h-7 w-13 rounded-full border-2 transition-colors no-touch-highlight"
      style={{
        width: 52,
        borderColor: checked ? "var(--neon)" : "var(--border-2)",
        background: checked ? "rgba(176,38,255,0.25)" : "var(--panel-2)",
      }}
      role="switch"
      aria-checked={checked}
    >
      <span
        className="absolute top-1/2 h-4.5 w-4.5 -translate-y-1/2 rounded-full transition-all"
        style={{
          height: 18,
          width: 18,
          left: checked ? 27 : 5,
          background: checked ? "var(--neon-soft)" : "var(--dim)",
          boxShadow: checked ? "0 0 10px var(--neon-glow)" : "none",
        }}
      />
    </button>
  );
}
