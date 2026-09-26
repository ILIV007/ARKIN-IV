"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { GameDefinition, GameSettingDef } from "@/lib/games/registry";
import { defaultSettings } from "@/lib/games/registry";
import type { GameProps } from "./types";
import {
  getHighScores,
  isHighScore,
  saveHighScore,
  getTopScore,
} from "@/lib/storage/highscores";
import { unlockAchievement } from "@/lib/storage/achievements";
import { playSfx } from "@/lib/audio/chiptune";
import { navigate } from "@/lib/router";
import { useT } from "@/lib/i18n";

type Phase = "intro" | "settings" | "playing" | "over";

const INITIALS_KEY = "arkin4.lastname.v1";

function SegButton({
  active,
  onClick,
  children,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accent: string;
}) {
  return (
    <button
      onClick={() => {
        playSfx("select");
        onClick();
      }}
      className="px-3 py-1.5 font-pixel text-[8px] sm:text-[9px] border-2 rounded-sm transition-all active:scale-95 no-touch-highlight"
      style={{
        color: active ? accent : "var(--ark-dim)",
        borderColor: active ? accent : "var(--ark-border)",
        background: active ? `${accent}18` : "transparent",
        textShadow: active ? `0 0 8px ${accent}88` : "none",
      }}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function SettingRow({
  def,
  value,
  onChange,
  accent,
}: {
  def: GameSettingDef;
  value: string | boolean | undefined;
  onChange: (v: string | boolean) => void;
  accent: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="font-pixel text-[8px] sm:text-[9px] ark-dim">{def.label}</div>
      <div className="flex flex-wrap gap-1.5">
        {def.type === "select"
          ? def.options?.map((o) => (
              <SegButton
                key={o.value}
                active={value === o.value}
                onClick={() => onChange(o.value)}
                accent={accent}
              >
                {o.label}
              </SegButton>
            ))
          : (
            <SegButton
              active={Boolean(value)}
              onClick={() => onChange(!value)}
              accent={accent}
            >
              {value ? "ON" : "OFF"}
            </SegButton>
          )}
      </div>
    </div>
  );
}

export function GameShell({ game }: { game: GameDefinition }) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("intro");
  const [settings, setSettings] = useState<Record<string, string | boolean>>(() =>
    defaultSettings(game)
  );
  const [difficulty, setDifficulty] = useState(game.difficulty[0]?.value ?? "normal");
  const [paused, setPaused] = useState(false);
  const [runId, setRunId] = useState(0);
  const [score, setScore] = useState(0);
  const [hudStats, setHudStats] = useState("");
  const [finalScore, setFinalScore] = useState(0);
  const [needsInitials, setNeedsInitials] = useState(false);
  const [initials, setInitials] = useState("AAA");
  const [savedRank, setSavedRank] = useState<number | null>(null);
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);

  const hiScore = useMemo(
    () => getTopScore(game.id),
    [game.id, phase, savedRank]
  );

  const GameComponent = GAME_COMPONENTS[game.id] ?? null;

  const startRun = useCallback(() => {
    playSfx("confirm");
    scoreRef.current = 0;
    gameOverRef.current = false;
    setScore(0);
    setHudStats("");
    setSavedRank(null);
    setNeedsInitials(false);
    setPaused(false);
    setRunId((r) => r + 1);
    setPhase("playing");
  }, []);

  const handleScore = useCallback((s: number) => {
    scoreRef.current = s;
    setScore(s);
  }, []);

  const handleGameOver = useCallback(
    (s: number) => {
      if (gameOverRef.current) return;
      gameOverRef.current = true;
      playSfx("die");
      setFinalScore(s);
      // score achievements
      for (const m of game.scoreAchievements ?? []) {
        if (s >= m.score) unlockAchievement(m.achievementId);
      }
      if (isHighScore(game.id, s)) {
        setNeedsInitials(true);
        const last = window.localStorage.getItem(INITIALS_KEY);
        setInitials(last || "AAA");
      }
      setPhase("over");
    },
    [game.id, game.scoreAchievements]
  );

  const submitInitials = useCallback(() => {
    const clean = (initials || "AAA").toUpperCase().slice(0, 3).padEnd(3, "A");
    window.localStorage.setItem(INITIALS_KEY, clean);
    const rank = saveHighScore(game.id, {
      name: clean,
      score: finalScore,
      difficulty,
      date: Date.now(),
    });
    setSavedRank(rank);
    setNeedsInitials(false);
    playSfx("coin");
  }, [difficulty, finalScore, game.id, initials]);

  // pause handling
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        e.preventDefault();
        setPaused((p) => {
          playSfx("pause");
          return !p;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  // ---------------- INTRO ----------------
  if (phase === "intro") {
    return (
      <div
        className="flex-1 flex flex-col min-h-0 ark-grid-bg"
        style={{ ["--ark-grid-line" as string]: `${game.accent}14` }}
      >
        <HeaderBar game={game} onExit={() => navigate("/")} />
        <div className="flex-1 overflow-y-auto ark-scroll px-4 sm:px-8 py-6 flex flex-col items-center gap-4">
          <pre
            className="font-pixel text-[7px] sm:text-[10px] lg:text-xs leading-[1.8] hidden md:block text-glow"
            style={{ color: game.accent }}
            aria-hidden
          >
            {game.asciiArt}
          </pre>
          <div className="font-pixel text-sm sm:text-xl text-glow md:hidden" style={{ color: game.accent }}>
            {game.title}
          </div>
          <div
            className="font-pixel text-[8px] sm:text-[9px] px-3 py-1.5 rounded-sm border-2"
            style={{ color: game.accent2, borderColor: `${game.accent2}66` }}
          >
            WORLD: {game.worldName}
          </div>
          <p className="max-w-xl font-term text-lg sm:text-xl leading-snug ark-text text-center">
            {game.lore}
          </p>
          <div className="max-w-md w-full ark-panel border-2 ark-bc rounded-md p-4">
            <div className="font-pixel text-[8px] ark-dim mb-2">{t.game.controls}</div>
            <ul className="font-term text-base sm:text-lg space-y-0.5">
              {game.controls.map((c) => (
                <li key={c} className="ark-accent2">
                  ▸ {c}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => {
              playSfx("confirm");
              setPhase("settings");
            }}
            className="mt-2 font-pixel text-[10px] sm:text-xs px-6 py-4 rounded-sm border-2 transition-all hover:scale-105 active:scale-95 no-touch-highlight"
            style={{
              color: game.accent,
              borderColor: game.accent,
              boxShadow: `0 0 16px ${game.accent}44`,
              textShadow: `0 0 10px ${game.accent}88`,
            }}
          >
            ▶ {t.game.insert}
          </button>
        </div>
      </div>
    );
  }

  // ---------------- SETTINGS ----------------
  if (phase === "settings") {
    return (
      <div
        className="flex-1 flex flex-col min-h-0 ark-grid-bg"
        style={{ ["--ark-grid-line" as string]: `${game.accent}14` }}
      >
        <HeaderBar game={game} onExit={() => navigate("/")} />
        <div className="flex-1 overflow-y-auto ark-scroll px-4 sm:px-8 py-5 flex flex-col gap-5 items-center">
          <div className="font-pixel text-[10px] sm:text-sm ark-accent text-glow">
            {t.game.settings}
          </div>

          <div className="w-full max-w-lg flex flex-col gap-2">
            <div className="font-pixel text-[8px] sm:text-[9px] ark-dim">
              {t.game.difficulty}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {game.difficulty.map((d) => (
                <SegButton
                  key={d.value}
                  active={difficulty === d.value}
                  onClick={() => setDifficulty(d.value)}
                  accent={game.accent}
                >
                  {d.label}
                </SegButton>
              ))}
            </div>
          </div>

          <div className="w-full max-w-lg flex flex-col gap-4">
            {game.settings.map((def) => (
              <SettingRow
                key={def.key}
                def={def}
                value={settings[def.key]}
                onChange={(v) => setSettings((s) => ({ ...s, [def.key]: v }))}
                accent={game.accent}
              />
            ))}
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={() => {
                playSfx("back");
                setPhase("intro");
              }}
              className="font-pixel text-[9px] px-4 py-3 border-2 ark-bc ark-dim rounded-sm active:scale-95 no-touch-highlight"
            >
              ◂ BACK
            </button>
            <button
              onClick={startRun}
              className="font-pixel text-[10px] sm:text-xs px-6 py-3 rounded-sm border-2 transition-all hover:scale-105 active:scale-95 no-touch-highlight"
              style={{
                color: game.accent,
                borderColor: game.accent,
                boxShadow: `0 0 16px ${game.accent}44`,
                textShadow: `0 0 10px ${game.accent}88`,
              }}
            >
              ▶ {t.game.start}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- PLAYING / OVER ----------------
  const showOver = phase === "over";

  return (
    <div
      className="flex-1 flex flex-col min-h-0"
      style={{ background: game.worldBg }}
    >
      {/* HUD */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 sm:px-6 py-2 border-b-2 border-black/40 bg-black/30">
        <div className="font-pixel text-[9px] sm:text-[11px]" style={{ color: game.accent }}>
          {game.title}
        </div>
        <div className="flex items-center gap-3 sm:gap-6 font-pixel text-[8px] sm:text-[10px]">
          <span className="ark-dim">
            {t.game.score} <span className="ark-ok">{String(score).padStart(6, "0")}</span>
          </span>
          <span className="ark-dim">
            {t.game.hiScore} <span className="ark-warn">{String(hiScore).padStart(6, "0")}</span>
          </span>
          {hudStats && (
            <span className="ark-accent2 hidden sm:inline">{hudStats}</span>
          )}
        </div>
        <button
          onClick={() => {
            playSfx("pause");
            setPaused(true);
          }}
          className="font-pixel text-[8px] px-2.5 py-1.5 border-2 ark-bc ark-dim rounded-sm active:scale-95 no-touch-highlight"
          aria-label="Pause"
        >
          ❚❚
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative min-h-0 flex items-center justify-center overflow-hidden">
        {GameComponent ? (
          <GameComponent
            key={runId}
            game={game}
            settings={settings}
            difficulty={difficulty}
            paused={paused || showOver}
            onScore={handleScore}
            onHudStats={setHudStats}
            onGameOver={handleGameOver}
          />
        ) : (
          <div className="ark-err font-pixel text-xs">CARTRIDGE ERROR</div>
        )}

        {/* Pause overlay */}
        {paused && !showOver && (
          <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-[2px] flex items-center justify-center">
            <div className="ark-panel border-2 ark-ba rounded-md p-6 sm:p-8 flex flex-col gap-3 items-center glow-box">
              <div className="font-pixel text-sm sm:text-lg ark-accent text-glow">
                {t.game.pause}
              </div>
              <div className="ark-dim font-term text-base">{t.game.pausedHint}</div>
              <div className="flex flex-col gap-2 mt-2 w-48">
                <PixelBtn accent={game.accent} onClick={() => { playSfx("confirm"); setPaused(false); }}>
                  ▶ {t.game.resume}
                </PixelBtn>
                <PixelBtn accent={game.accent2} onClick={() => { playSfx("confirm"); setPaused(false); startRun(); }}>
                  ↺ {t.game.restart}
                </PixelBtn>
                <PixelBtn accent="var(--ark-dim)" onClick={() => { playSfx("back"); navigate("/"); }}>
                  ✕ {t.game.quit}
                </PixelBtn>
              </div>
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {showOver && (
          <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto ark-scroll">
            <div className="ark-panel border-2 rounded-md p-5 sm:p-7 flex flex-col gap-3 items-center glow-box my-auto" style={{ borderColor: game.accent }}>
              <div className="font-pixel text-base sm:text-2xl glitch" style={{ color: game.accent, textShadow: `0 0 14px ${game.accent}` }}>
                {t.game.gameOver}
              </div>
              <div className="font-pixel text-[10px] sm:text-sm ark-text">
                {t.game.score}: <span className="ark-ok">{String(finalScore).padStart(6, "0")}</span>
              </div>

              {needsInitials ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="font-pixel text-[9px] ark-warn text-glow">{t.game.newRecord}</div>
                  <div className="font-term text-lg ark-dim">{t.game.enterInitials}</div>
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={initials}
                      maxLength={3}
                      onChange={(e) =>
                        setInitials(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitInitials();
                      }}
                      className="w-24 text-center font-pixel text-lg py-2 bg-transparent outline-none border-2 rounded-sm"
                      style={{ color: game.accent, borderColor: game.accent }}
                      aria-label="Enter initials"
                    />
                    <PixelBtn accent={game.accent} onClick={submitInitials}>
                      ✓ SAVE
                    </PixelBtn>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 max-h-44 overflow-y-auto ark-scroll w-64">
                  {getHighScores(game.id).length === 0 ? (
                    <div className="font-term text-base ark-dim">{t.game.noScores}</div>
                  ) : (
                    getHighScores(game.id).map((s, i) => {
                      const mine = savedRank === i + 1;
                      return (
                        <div
                          key={s.date + "" + i}
                          className={`w-full flex justify-between font-term text-base px-2 rounded-sm ${mine ? "ark-accent" : "ark-text"}`}
                          style={mine ? { background: `${game.accent}22` } : undefined}
                        >
                          <span>
                            {String(i + 1).padStart(2, "0")}. {s.name}
                          </span>
                          <span>{String(s.score).padStart(6, "0")}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-2 mt-2">
                <PixelBtn accent={game.accent} onClick={() => { playSfx("confirm"); startRun(); }}>
                  ↺ {t.game.retry}
                </PixelBtn>
                <PixelBtn accent={game.accent2} onClick={() => { playSfx("back"); setPhase("settings"); }}>
                  ⚙ {t.game.backToSettings}
                </PixelBtn>
                <PixelBtn accent="var(--ark-dim)" onClick={() => { playSfx("back"); navigate("/"); }}>
                  ✕ {t.game.quit}
                </PixelBtn>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Touch hint footer */}
      <div className="shrink-0 hidden md:flex justify-center py-1 font-term text-sm ark-dim bg-black/20">
        {t.game.pausedHint} · {game.controls[0]}
      </div>
    </div>
  );
}

function PixelBtn({
  accent,
  onClick,
  children,
}: {
  accent: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="font-pixel text-[9px] px-4 py-2.5 border-2 rounded-sm transition-all hover:scale-105 active:scale-95 no-touch-highlight"
      style={{ color: accent, borderColor: accent, textShadow: `0 0 8px ${accent}55` }}
    >
      {children}
    </button>
  );
}

function HeaderBar({ game, onExit }: { game: GameDefinition; onExit: () => void }) {
  const t = useT();
  return (
    <div className="shrink-0 flex items-center justify-between px-3 sm:px-6 py-3 border-b-2 ark-bc bg-black/20">
      <div className="font-pixel text-[9px] sm:text-xs" style={{ color: game.accent, textShadow: `0 0 10px ${game.accent}66` }}>
        {game.title}
      </div>
      <button
        onClick={() => {
          playSfx("back");
          onExit();
        }}
        className="font-pixel text-[8px] sm:text-[9px] px-3 py-2 border-2 ark-bc ark-dim hover:ark-ba hover:ark-accent transition-colors rounded-sm no-touch-highlight"
      >
        ◂ {t.console.backToTerminal}
      </button>
    </div>
  );
}

/* Lazy game component map — populated in games/index.tsx */
import { GAME_COMPONENTS } from "../index";
