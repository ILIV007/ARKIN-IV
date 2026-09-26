"use client";

import { GAMES } from "@/lib/games/registry";
import { getHighScores, type HighScore } from "@/lib/storage/highscores";
import { navigate } from "@/lib/router";
import { playSfx } from "@/lib/audio/chiptune";
import { useT } from "@/lib/i18n";
import { useMemo, useState } from "react";

export function ScoresPage() {
  const t = useT();
  const [tab, setTab] = useState(GAMES[0].id);
  const scores = useMemo(() => {
    const db: Record<string, HighScore[]> = {};
    for (const g of GAMES) db[g.id] = getHighScores(g.id);
    return db;
    // recompute when tab changes so each board is fresh
  }, [tab]);

  const game = GAMES.find((g) => g.id === tab) ?? GAMES[0];
  const list = scores[tab] ?? [];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 flex items-center justify-between px-3 sm:px-6 py-3 border-b-2 ark-bc">
        <div className="font-pixel text-[11px] sm:text-sm ark-accent text-glow">
          HALL OF FAME
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

      <div className="shrink-0 flex gap-1.5 px-3 sm:px-6 py-3 overflow-x-auto ark-scroll">
        {GAMES.map((g) => (
          <button
            key={g.id}
            onClick={() => {
              playSfx("select");
              setTab(g.id);
            }}
            className="shrink-0 font-pixel text-[8px] sm:text-[9px] px-3 py-2 border-2 rounded-sm transition-all active:scale-95 no-touch-highlight"
            style={{
              color: tab === g.id ? g.accent : "var(--ark-dim)",
              borderColor: tab === g.id ? g.accent : "var(--ark-border)",
              textShadow: tab === g.id ? `0 0 8px ${g.accent}77` : "none",
            }}
          >
            {g.title}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto ark-scroll px-3 sm:px-6 pb-4">
        {list.length === 0 ? (
          <div className="h-full min-h-40 flex flex-col items-center justify-center gap-3 text-center">
            <div className="text-4xl">👾</div>
            <div className="font-term text-lg ark-dim">{t.game.noScores}</div>
            <button
              onClick={() => {
                playSfx("confirm");
                navigate(`/games/${game.id}`);
              }}
              className="font-pixel text-[9px] px-4 py-3 border-2 rounded-sm active:scale-95 no-touch-highlight"
              style={{ color: game.accent, borderColor: game.accent }}
            >
              ▶ PLAY {game.title}
            </button>
          </div>
        ) : (
          <div className="max-w-md mx-auto ark-panel border-2 ark-bc rounded-md overflow-hidden">
            {list.map((s, i) => (
              <div
                key={s.date + "" + i}
                className={[
                  "flex items-center justify-between px-4 py-2.5 font-term text-base sm:text-lg border-b last:border-0 ark-bc",
                  i === 0 ? "ark-ok" : "ark-text",
                ].join(" ")}
                style={i === 0 ? { background: "color-mix(in srgb, var(--ark-ok) 8%, transparent)" } : undefined}
              >
                <span className="flex items-center gap-3">
                  <span className={i < 3 ? "font-pixel text-[9px]" : "ark-dim"}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-pixel text-[10px]">{s.name}</span>
                  <span className="ark-dim text-sm">{s.difficulty}</span>
                </span>
                <span className="font-pixel text-[10px] sm:text-xs">
                  {String(s.score).padStart(6, "0")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
