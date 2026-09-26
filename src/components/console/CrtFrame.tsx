"use client";

import { useEffect } from "react";
import { useConsoleStore } from "@/store/console-store";

/**
 * The console chassis: bezel + CRT screen with scanlines / vignette / flicker.
 * Also syncs the selected theme to the document root.
 */
export function CrtFrame({ children }: { children: React.ReactNode }) {
  const theme = useConsoleStore((s) => s.theme);
  const crtIntensity = useConsoleStore((s) => s.crtIntensity);
  const scanlines = useConsoleStore((s) => s.scanlines);
  const flicker = useConsoleStore((s) => s.flicker);

  useEffect(() => {
    document.documentElement.dataset.arkTheme = theme;
  }, [theme]);

  const showScan = scanlines && crtIntensity !== "off";
  const lowFx = crtIntensity === "low";
  const showFlicker = flicker && crtIntensity === "high";

  return (
    <div
      className="ark-root no-touch-highlight w-full min-h-dvh p-0 sm:p-4 lg:p-8"
      aria-label="ARKIN-IV console"
    >
      <div className="w-full max-w-5xl mx-auto flex flex-col min-h-0 h-full">
        {/* Bezel */}
        <div
          className="flex-1 flex flex-col rounded-none sm:rounded-2xl overflow-hidden border border-black/60"
          style={{
            background: "linear-gradient(180deg,#1a1d24 0%,#101318 100%)",
            boxShadow:
              "0 24px 80px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.06)",
          }}
        >
          {/* Top strip */}
          <div className="hidden sm:flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5 shrink-0">
            <div className="font-pixel text-[10px] tracking-widest text-neutral-500">
              ARKIN<span className="text-purple-400">-IV</span> ENTERTAINMENT
              SYSTEM
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#34d399]" />
              <span className="font-pixel text-[8px] text-neutral-500">
                POWER
              </span>
              <span className="ml-3 h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_6px_#a855f7] animate-pulse" />
              <span className="font-pixel text-[8px] text-neutral-500">
                CRT
              </span>
            </div>
          </div>

          {/* Screen */}
          <div
            className={[
              "ark-screen relative flex-1 flex flex-col min-h-0",
              showScan ? "crt-scanlines" : "",
              "crt-vignette",
              showFlicker ? "crt-flicker" : "",
              lowFx ? "opacity-95" : "",
            ].join(" ")}
          >
            {children}
          </div>

          {/* Bottom strip */}
          <div className="hidden sm:flex items-center justify-between px-4 py-1.5 bg-black/40 border-t border-white/5 shrink-0">
            <div className="font-pixel text-[8px] text-neutral-600">
              ARKIN CORP. 1987 — 2026
            </div>
            <div className="flex gap-1.5">
              <span className="h-1.5 w-6 rounded-sm bg-neutral-700" />
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
            </div>
          </div>
        </div>

        {/* Under-bezel hint */}
        <div className="hidden lg:block text-center font-pixel text-[8px] text-neutral-700 pt-3 shrink-0">
          ARKIN-IV · MODEL IV-T · SERIAL NO. 000-1987 · EST. SCORES SAVED
          LOCALLY
        </div>
      </div>
    </div>
  );
}
