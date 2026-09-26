"use client";

import { ACHIEVEMENTS, getUnlockedIds } from "@/lib/storage/achievements";
import { navigate } from "@/lib/router";
import { playSfx } from "@/lib/audio/chiptune";
import { useT } from "@/lib/i18n";
import { useConsoleStore } from "@/store/console-store";
import { useMemo } from "react";

export function TrophiesPage() {
  const t = useT();
  const konami = useConsoleStore((s) => s.konamiUnlocked);
  const unlocked = useMemo(() => getUnlockedIds(), [konami]);

  const count = unlocked.length;
  const total = ACHIEVEMENTS.length;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 flex items-center justify-between px-3 sm:px-6 py-3 border-b-2 ark-bc">
        <div>
          <div className="font-pixel text-[11px] sm:text-sm ark-warn text-glow">
            🏆 {t.trophies.title}
          </div>
          <div className="font-term text-sm sm:text-base ark-dim">
            {count} / {total} {t.trophies.unlocked}
          </div>
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

      <div className="shrink-0 px-3 sm:px-6 py-2">
        <div className="h-3 border-2 ark-bc rounded-sm overflow-hidden">
          <div
            className="h-full transition-all"
            style={{
              width: `${total ? (count / total) * 100 : 0}%`,
              background: "linear-gradient(90deg, var(--ark-accent), var(--ark-warn))",
              boxShadow: "0 0 10px var(--ark-glow)",
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto ark-scroll px-3 sm:px-6 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-w-4xl mx-auto">
          {ACHIEVEMENTS.map((a) => {
            const has = unlocked.includes(a.id);
            const isSecret = a.secret && !has;
            return (
              <div
                key={a.id}
                className="flex items-start gap-3 p-3 border-2 rounded-sm transition-all"
                style={{
                  borderColor: has ? "var(--ark-accent)" : "var(--ark-border)",
                  background: has ? "color-mix(in srgb, var(--ark-accent) 8%, var(--ark-panel))" : "var(--ark-panel)",
                  opacity: has ? 1 : 0.65,
                }}
              >
                <span className="text-2xl shrink-0" aria-hidden>
                  {isSecret ? "❓" : has ? a.icon : "🔒"}
                </span>
                <div className="min-w-0">
                  <div
                    className="font-pixel text-[8px] sm:text-[9px] truncate"
                    style={{ color: has ? "var(--ark-accent)" : "var(--ark-dim)" }}
                  >
                    {isSecret ? "???" : a.title}
                  </div>
                  <div className="font-term text-sm sm:text-base ark-dim">
                    {isSecret ? "SECRET TROPHY" : a.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
