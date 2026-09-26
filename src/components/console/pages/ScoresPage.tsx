"use client";

import { useEffect, useState } from "react";
import { GAMES } from "@/lib/games/registry";
import { getHighScores } from "@/lib/storage/highscores";
import { useT } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { playSfx } from "@/lib/audio/chiptune";

interface HighScore {
  name: string;
  score: number;
  difficulty: string;
  date: number;
}

export function ScoresPage() {
  const t = useT();
  const [db, setDb] = useState<Record<string, HighScore[]>>({});

  useEffect(() => {
    const id = window.setTimeout(() => {
      const next: Record<string, HighScore[]> = {};
      for (const g of GAMES) next[g.id] = getHighScores(g.id);
      setDb(next);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 text-center">
        <h1 className="font-pixel text-base sm:text-xl">
          <span className="ark-text">HALL OF </span>
          <span style={{ color: "var(--warn)", textShadow: "0 0 20px rgba(251,191,36,0.45)" }}>
            FAME
          </span>
        </h1>
        <p className="mt-3 text-sm ark-dim sm:text-base">{t.scores.sub}</p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {GAMES.map((g, i) => {
          const list = db[g.id] ?? [];
          return (
            <section
              key={g.id}
              className="surface overflow-hidden fade-up"
              style={{ animation: `fadeUp 0.5s ${i * 0.07}s both` }}
              aria-label={g.title}
            >
              <div
                className="flex items-center justify-between border-b px-4 py-3"
                style={{ borderColor: "var(--border)", background: g.worldBg }}
              >
                <button
                  onClick={() => {
                    playSfx("confirm");
                    navigate(`#/games/${g.id}`);
                  }}
                  className="font-pixel text-[9px] transition-opacity hover:opacity-80"
                  style={{ color: g.accent, textShadow: `0 0 12px ${g.accent}66` }}
                >
                  {g.title}
                </button>
                <span
                  className="rounded-md border px-2 py-1 font-pixel text-[6px]"
                  style={{ borderColor: `${g.accent}55`, color: g.accent }}
                >
                  {g.worldName}
                </span>
              </div>

              <div className="ark-scroll max-h-72 overflow-y-auto p-2">
                {list.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <span className="text-2xl opacity-60" aria-hidden>👾</span>
                    <span className="text-sm ark-dim">{t.scores.empty}</span>
                  </div>
                ) : (
                  <ol className="flex flex-col gap-0.5 p-1">
                    {list.map((s, idx) => (
                      <li
                        key={s.date + "-" + idx}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 font-term text-base transition-colors hover:bg-[var(--panel-2)]"
                      >
                        <span
                          className="w-7 font-pixel text-[8px]"
                          style={{
                            color:
                              idx === 0 ? "var(--warn)" : idx === 1 ? "#e2e8f0" : idx === 2 ? "#d09a6a" : "var(--dim)",
                          }}
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="font-pixel text-[10px] ark-text">{s.name}</span>
                        <span className="ml-auto ark-dim text-xs">{s.difficulty.toUpperCase()}</span>
                        <span className="w-20 text-right font-bold" style={{ color: g.accent }}>
                          {String(s.score).padStart(6, "0")}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
