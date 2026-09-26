"use client";

import { useEffect, useState } from "react";
import { unlockAchievement } from "@/lib/storage/achievements";

const SEEN_KEY = "arkin4.poweron.v2";

/**
 * PowerOn — a short, modern "console boot" moment.
 * Logo flicker + progress bar, ~1.6s, skippable with any input,
 * shown once per browser session. No confusing terminal text.
 */
export function PowerOn({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setLeaving(true);
      window.setTimeout(() => {
        try {
          window.sessionStorage.setItem(SEEN_KEY, "1");
        } catch {
          /* ignore */
        }
        unlockAchievement("first_boot");
        onDone();
      }, 340);
    };

    const timer = window.setTimeout(finish, 1750);
    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [onDone]);

  return (
    <div
      aria-label="Console powering on"
      className="fixed inset-0 z-[200] flex items-center justify-center transition-opacity duration-300"
      style={{
        background: "var(--bg)",
        opacity: leaving ? 0 : 1,
      }}
    >
      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <div className="logo-in">
          <div className="font-pixel text-2xl sm:text-4xl" style={{ color: "var(--text)" }}>
            ARKIN{" "}
            <span
              style={{
                color: "var(--neon-soft)",
                textShadow: "0 0 24px var(--neon-glow)",
              }}
            >
              IV
            </span>
          </div>
        </div>
        <div
          className="text-[11px] sm:text-xs tracking-[0.45em] ark-dim fade-up"
          style={{ animationDelay: "0.25s" }}
        >
          ENTERTAINMENT SYSTEM
        </div>

        {/* progress bar */}
        <div
          className="mt-2 h-1.5 w-44 sm:w-56 overflow-hidden rounded-full"
          style={{ background: "var(--border)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, var(--neon), var(--cyan))",
              animation: "powerBar 1.6s cubic-bezier(0.3, 0.9, 0.4, 1) forwards",
            }}
          />
        </div>

        <div className="blink font-pixel text-[7px] sm:text-[8px] ark-dim mt-1">
          CLICK OR PRESS ANY KEY
        </div>
      </div>

      <style>{`@keyframes powerBar { from { width: 4% } to { width: 100% } }`}</style>
    </div>
  );
}

/** Returns true if the power-on animation should be skipped (already seen this session). */
export function powerOnSeen(): boolean {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}
