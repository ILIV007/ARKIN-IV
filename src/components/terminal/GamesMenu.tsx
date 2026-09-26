"use client";

import { GAMES } from "@/lib/games/registry";
import { getTopScore } from "@/lib/storage/highscores";
import { getUnlockedIds } from "@/lib/storage/achievements";
import { navigate } from "@/lib/router";
import { playSfx } from "@/lib/audio/chiptune";
import { useT } from "@/lib/i18n";
import { useEffect, useMemo, useRef, useState } from "react";

function GameIcon({ id }: { id: string }) {
  // pixel-ish emoji icons per cartridge
  const map: Record<string, string> = {
    snake: "🐍",
    muncher: "👻",
    blockfall: "🧱",
    pong: "🏓",
  };
  return <span className="text-3xl sm:text-4xl leading-none">{map[id] ?? "🎮"}</span>;
}

export function GamesMenu() {
  const t = useT();
  const topScores = useMemo(() => {
    const scores: Record<string, number> = {};
    for (const g of GAMES) scores[g.id] = getTopScore(g.id);
    return scores;
  }, []);
  const [selected, setSelected] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cols = 2;
      if (e.key === "ArrowRight") {
        setSelected((s) => Math.min(GAMES.length - 1, s + 1));
        playSfx("select");
      } else if (e.key === "ArrowLeft") {
        setSelected((s) => Math.max(0, s - 1));
        playSfx("select");
      } else if (e.key === "ArrowDown") {
        setSelected((s) => Math.min(GAMES.length - 1, s + cols));
        playSfx("select");
      } else if (e.key === "ArrowUp") {
        setSelected((s) => Math.max(0, s - cols));
        playSfx("select");
      } else if (e.key === "Enter") {
        playSfx("confirm");
        navigate(`/games/${GAMES[selected].id}`);
      } else if (e.key === "Escape") {
        navigate("/");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 sm:px-6 py-3 border-b-2 ark-bc">
        <div>
          <div className="font-pixel text-[11px] sm:text-sm ark-accent text-glow">
            CARTRIDGE SHELF
          </div>
          <div className="ark-dim font-term text-sm sm:text-base">
            {GAMES.length} cartridges detected — INSERT one to play
          </div>
        </div>
        <button
          onClick={() => {
            playSfx("back");
            navigate("/");
          }}
          className="font-pixel text-[8px] sm:text-[9px] px-3 py-2 border-2 ark-bc ark-dim hover:ark-ba hover:ark-accent transition-colors rounded-sm no-touch-highlight"
        >
          ◂ TERMINAL
        </button>
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        className="flex-1 overflow-y-auto ark-scroll p-3 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 content-start"
        role="listbox"
        aria-label="Game cartridges"
      >
        {GAMES.map((g, i) => {
          const isSel = i === selected;
          const trophies = getUnlockedIds().length;
          void trophies;
          return (
            <button
              key={g.id}
              role="option"
              aria-selected={isSel}
              onMouseEnter={() => setSelected(i)}
              onClick={() => {
                playSfx("confirm");
                navigate(`/games/${g.id}`);
              }}
              className={[
                "text-left relative rounded-md p-4 border-2 transition-all no-touch-highlight",
                "flex flex-col gap-2 group",
                isSel ? "scale-[1.015]" : "opacity-90 hover:opacity-100",
              ].join(" ")}
              style={{
                background: g.worldBg,
                borderColor: isSel ? g.accent : "var(--ark-border)",
                boxShadow: isSel
                  ? `0 0 18px ${g.accent}55, inset 0 0 24px rgba(0,0,0,.45)`
                  : "inset 0 0 18px rgba(0,0,0,.4)",
              }}
            >
              {/* cartridge slot ridge */}
              <div className="absolute top-0 left-4 right-4 h-1.5 bg-black/40 rounded-b" />
              <div className="flex items-start justify-between gap-2 pt-2">
                <div className="flex items-center gap-3">
                  <GameIcon id={g.id} />
                  <div>
                    <div
                      className="font-pixel text-[10px] sm:text-[12px] leading-relaxed"
                      style={{ color: g.accent, textShadow: `0 0 10px ${g.accent}66` }}
                    >
                      {g.title}
                    </div>
                    <div className="font-term text-sm sm:text-base ark-dim">
                      {g.tagline}
                    </div>
                  </div>
                </div>
                <div
                  className="shrink-0 font-pixel text-[7px] sm:text-[8px] px-2 py-1 rounded-sm border"
                  style={{ color: g.accent2, borderColor: `${g.accent2}66` }}
                >
                  {g.worldName}
                </div>
              </div>

              <div className="flex items-center justify-between font-term text-sm sm:text-base mt-1">
                <span className="ark-dim">
                  HI-SCORE:{" "}
                  <span className="ark-ok">
                    {topScores[g.id] ? String(topScores[g.id]).padStart(6, "0") : "000000"}
                  </span>
                </span>
                <span
                  className="font-pixel text-[8px] transition-transform group-hover:translate-x-0.5"
                  style={{ color: g.accent }}
                >
                  {isSel ? "▸ INSERT & PLAY" : "INSERT ▸"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="shrink-0 border-t-2 ark-bc px-3 sm:px-6 py-2 font-term text-sm sm:text-base ark-dim flex justify-between">
        <span>↑↓←→ + ENTER · or CLICK a cartridge</span>
        <span className="hidden sm:inline">{t.console.version}</span>
      </div>
    </div>
  );
}
