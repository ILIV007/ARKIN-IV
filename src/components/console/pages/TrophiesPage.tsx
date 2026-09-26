"use client";

import { useEffect, useState } from "react";
import { ACHIEVEMENTS, getUnlockedIds } from "@/lib/storage/achievements";
import { useT } from "@/lib/i18n";

export function TrophiesPage() {
  const t = useT();
  const [unlocked, setUnlocked] = useState<string[]>([]);

  useEffect(() => {
    const id = window.setTimeout(() => setUnlocked(getUnlockedIds()), 0);
    return () => window.clearTimeout(id);
  }, []);

  const pct = Math.round((unlocked.length / ACHIEVEMENTS.length) * 100);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 text-center">
        <h1 className="font-pixel text-base sm:text-xl">
          <span className="ark-text">TROPHY </span>
          <span style={{ color: "var(--warn)", textShadow: "0 0 20px rgba(251,191,36,0.45)" }}>
            ROOM
          </span>
        </h1>
        <p className="mt-3 text-sm ark-dim sm:text-base">{t.trophies.sub}</p>
      </header>

      {/* progress */}
      <div className="surface mb-8 flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between font-pixel text-[8px] sm:text-[9px]">
          <span className="ark-dim">
            {t.trophies.progress} {unlocked.length}/{ACHIEVEMENTS.length}
          </span>
          <span style={{ color: "var(--warn)" }}>{pct}%</span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full"
          style={{ background: "var(--border)" }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, var(--neon), var(--warn))",
              boxShadow: "0 0 14px var(--neon-glow)",
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a, i) => {
          const got = unlocked.includes(a.id);
          const secretHidden = a.secret && !got;
          return (
            <div
              key={a.id}
              className="surface card-hover flex items-center gap-4 p-4"
              style={{
                animation: `fadeUp 0.4s ${Math.min(i * 0.04, 0.5)}s both`,
                opacity: got ? 1 : 0.62,
                borderColor: got ? "var(--border-2)" : "var(--border)",
              }}
            >
              <div
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl"
                style={{
                  background: got ? "rgba(251,191,36,0.12)" : "var(--panel-2)",
                  border: got ? "1px solid rgba(251,191,36,0.4)" : "1px solid var(--border)",
                  filter: got ? "none" : "grayscale(1)",
                  boxShadow: got ? "0 0 18px -6px rgba(251,191,36,0.5)" : "none",
                }}
                aria-hidden
              >
                {secretHidden ? "❓" : a.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    className="truncate text-sm font-semibold"
                    style={{ color: got ? "var(--text)" : "var(--dim)" }}
                  >
                    {secretHidden ? "???" : a.title}
                  </h3>
                  {a.secret && got && (
                    <span
                      className="rounded px-1.5 py-0.5 font-pixel text-[5px]"
                      style={{ background: "rgba(176,38,255,0.18)", color: "var(--neon-soft)" }}
                    >
                      SECRET
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed ark-dim">
                  {secretHidden ? t.trophies.secretDesc : a.desc}
                </p>
                <span
                  className="mt-1.5 inline-block font-pixel text-[6px]"
                  style={{ color: got ? "var(--ok)" : "var(--dim)" }}
                >
                  {got ? "✓ UNLOCKED" : "🔒 " + t.trophies.locked}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
