"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronLeft,
  Gamepad2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  X,
} from "lucide-react";
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
const PLAYED_KEY = "arkin4.played.v1";

function trackPlayed(gameId: string) {
  try {
    const raw = window.localStorage.getItem(PLAYED_KEY);
    const played = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
    played.add(gameId);
    window.localStorage.setItem(PLAYED_KEY, JSON.stringify([...played]));
    unlockAchievement("first_run");
    if (played.size >= 4) unlockAchievement("all_games");
  } catch {
    /* ignore */
  }
}

/* ---------------- small building blocks ---------------- */

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
      className="rounded-lg border-2 px-3.5 py-2 font-pixel text-[8px] transition-all active:scale-95 no-touch-highlight"
      style={{
        color: active ? accent : "var(--dim)",
        borderColor: active ? accent : "var(--border)",
        background: active ? `${accent}1a` : "transparent",
        boxShadow: active ? `0 0 14px -4px ${accent}` : "none",
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
    <div className="flex flex-col gap-2">
      <div className="font-pixel text-[8px] ark-dim">{def.label}</div>
      <div className="flex flex-wrap gap-2">
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
      className="btn-pixel flex items-center justify-center gap-1.5 px-4 py-3 font-pixel text-[9px]"
      style={{ color: accent, borderColor: accent }}
    >
      {children}
    </button>
  );
}

/* ---------------- main shell ---------------- */

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
    trackPlayed(game.id);
    scoreRef.current = 0;
    gameOverRef.current = false;
    setScore(0);
    setHudStats("");
    setSavedRank(null);
    setNeedsInitials(false);
    setPaused(false);
    setRunId((r) => r + 1);
    setPhase("playing");
  }, [game.id]);

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

  // pause hotkey
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

  const goHome = () => navigate("/");

  /* ---------------- INTRO ---------------- */
  if (phase === "intro") {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col"
        style={{ background: "var(--bg)" }}
      >
        <GameHeader game={game} />
        <div className="ark-scroll flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 py-8 sm:px-6 sm:py-10">
            {/* world banner */}
            <div
              className="relative flex h-40 w-full max-w-xl items-center justify-center overflow-hidden rounded-2xl border fade-up sm:h-48"
              style={{ background: game.worldBg, borderColor: "var(--border)" }}
            >
              <div
                className="absolute inset-0 opacity-60"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
                aria-hidden
              />
              <div
                className="absolute h-32 w-32 rounded-full blur-3xl"
                style={{ background: `${game.accent}38` }}
                aria-hidden
              />
              <div className="relative text-center">
                <div
                  className="font-pixel text-base sm:text-2xl ink-glow"
                  style={{ color: game.accent }}
                >
                  {game.title}
                </div>
                <div
                  className="mt-3 inline-block rounded-md border px-3 py-1.5 font-pixel text-[7px] sm:text-[8px]"
                  style={{
                    borderColor: `${game.accent2}66`,
                    color: game.accent2,
                    background: "rgba(0,0,0,0.4)",
                  }}
                >
                  {t.game.world}: {game.worldName}
                </div>
              </div>
            </div>

            <p
              className="fade-up max-w-xl text-center text-base leading-relaxed ark-dim sm:text-lg"
              style={{ animationDelay: "0.08s" }}
            >
              {game.lore}
            </p>

            {/* controls + best */}
            <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="surface p-4">
                <div className="mb-2.5 flex items-center gap-2 font-pixel text-[8px] ark-dim">
                  <Gamepad2 size={12} />
                  {t.game.controls}
                </div>
                <ul className="space-y-1.5 font-term text-sm">
                  {game.controls.map((c) => (
                    <li key={c} style={{ color: "var(--cyan)" }}>
                      ▸ {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="surface flex flex-col justify-center gap-2 p-4">
                <div className="font-pixel text-[8px] ark-dim">{t.game.hiScore}</div>
                <div className="font-term text-3xl font-bold" style={{ color: "var(--warn)" }}>
                  {String(hiScore).padStart(6, "0")}
                </div>
                <div className="flex gap-1.5">
                  {game.difficulty.map((d) => (
                    <span
                      key={d.value}
                      className="rounded-md border px-2 py-1 font-pixel text-[6px]"
                      style={{ borderColor: "var(--border)", color: "var(--dim)" }}
                    >
                      {d.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                playSfx("confirm");
                setPhase("settings");
              }}
              className="btn-pixel mt-1 flex items-center gap-2 px-8 py-4 font-pixel text-[10px] sm:text-xs"
              style={{
                color: game.accent,
                borderColor: game.accent,
                boxShadow: `0 0 24px -6px ${game.accent}`,
              }}
            >
              <Play size={13} strokeWidth={3} />
              {t.game.insert}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- SETTINGS ---------------- */
  if (phase === "settings") {
    return (
      <div className="flex min-h-0 flex-1 flex-col" style={{ background: "var(--bg)" }}>
        <GameHeader game={game} />
        <div className="ark-scroll flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 px-4 py-8 sm:px-6">
            <h2 className="font-pixel text-xs sm:text-sm ark-accent text-glow">
              {t.game.settings}
            </h2>

            <div className="surface w-full p-5">
              <div className="mb-3 font-pixel text-[8px] ark-dim">
                {t.game.difficulty}
              </div>
              <div className="flex flex-wrap gap-2">
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

            <div className="surface flex w-full flex-col gap-5 p-5">
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

            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => {
                  playSfx("back");
                  setPhase("intro");
                }}
                className="btn-pixel px-5 py-3.5 font-pixel text-[9px] ark-dim"
              >
                ◂ BACK
              </button>
              <button
                onClick={startRun}
                className="btn-pixel flex items-center gap-2 px-7 py-3.5 font-pixel text-[10px]"
                style={{
                  color: game.accent,
                  borderColor: game.accent,
                  boxShadow: `0 0 22px -6px ${game.accent}`,
                }}
              >
                <Play size={12} strokeWidth={3} />
                {t.game.start}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- PLAYING / OVER ---------------- */
  const showOver = phase === "over";

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{ background: game.worldBg }}
    >
      {/* HUD */}
      <div
        className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2 sm:px-5"
        style={{ borderColor: "rgba(0,0,0,0.45)", background: "rgba(0,0,0,0.35)" }}
      >
        <button
          onClick={() => {
            playSfx("back");
            goHome();
          }}
          className="flex items-center gap-1.5 rounded-lg border px-2.5 py-2 font-pixel text-[7px] transition-colors no-touch-highlight"
          style={{ borderColor: "rgba(255,255,255,0.16)", color: "var(--dim)" }}
          aria-label={t.game.quit}
        >
          <ChevronLeft size={11} />
          {t.game.backToLibrary}
        </button>

        <div className="font-pixel text-[9px] sm:text-[11px]" style={{ color: game.accent }}>
          {game.title}
        </div>

        <div className="flex items-center gap-2.5 font-pixel text-[7px] sm:gap-5 sm:text-[9px]">
          <span className="ark-dim">
            {t.game.score}{" "}
            <span style={{ color: "var(--ok)" }}>{String(score).padStart(6, "0")}</span>
          </span>
          <span className="ark-dim hidden sm:inline">
            {t.game.hiScore}{" "}
            <span style={{ color: "var(--warn)" }}>{String(hiScore).padStart(6, "0")}</span>
          </span>
          {hudStats && (
            <span style={{ color: game.accent2 }} className="hidden md:inline">
              {hudStats}
            </span>
          )}
          <button
            onClick={() => {
              playSfx("pause");
              setPaused(true);
            }}
            className="rounded-lg border px-2.5 py-1.5 no-touch-highlight"
            style={{ borderColor: "rgba(255,255,255,0.16)", color: "var(--dim)" }}
            aria-label="Pause"
          >
            <Pause size={11} />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="relative min-h-0 flex-1 flex items-center justify-center overflow-hidden">
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
          <div className="font-pixel text-xs ark-err">CARTRIDGE ERROR</div>
        )}

        {/* Pause overlay */}
        {paused && !showOver && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-[3px]">
            <div className="glow-box flex w-64 flex-col items-center gap-2.5 rounded-2xl border-2 p-6 sm:w-72" style={{ background: "var(--panel)", borderColor: "var(--border-2)" }}>
              <div className="font-pixel text-sm" style={{ color: game.accent }}>
                {t.game.pause}
              </div>
              <div className="font-term text-sm ark-dim">{t.game.pausedHint}</div>
              <div className="mt-2 flex w-full flex-col gap-2">
                <PixelBtn accent={game.accent} onClick={() => { playSfx("confirm"); setPaused(false); }}>
                  <Play size={11} /> {t.game.resume}
                </PixelBtn>
                <PixelBtn accent={game.accent2} onClick={() => { playSfx("confirm"); setPaused(false); startRun(); }}>
                  <RotateCcw size={11} /> {t.game.restart}
                </PixelBtn>
                <PixelBtn accent="var(--dim)" onClick={() => { playSfx("back"); goHome(); }}>
                  <X size={11} /> {t.game.quit}
                </PixelBtn>
              </div>
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {showOver && (
          <div className="ark-scroll absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-[3px]">
            <div
              className="glow-box my-auto flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border-2 p-5 sm:p-7"
              style={{ background: "var(--panel)", borderColor: game.accent }}
            >
              <div
                className="glitch font-pixel text-lg sm:text-2xl"
                style={{ color: game.accent, textShadow: `0 0 16px ${game.accent}` }}
              >
                {t.game.gameOver}
              </div>
              <div className="font-pixel text-[10px] sm:text-sm ark-text">
                {t.game.score}:{" "}
                <span style={{ color: "var(--ok)" }}>{String(finalScore).padStart(6, "0")}</span>
              </div>

              {needsInitials ? (
                <div className="flex flex-col items-center gap-2.5">
                  <div className="font-pixel text-[9px]" style={{ color: "var(--warn)", textShadow: "0 0 12px rgba(251,191,36,0.5)" }}>
                    {t.game.newRecord}
                  </div>
                  <div className="text-sm ark-dim">{t.game.enterInitials}</div>
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
                      className="w-24 rounded-lg border-2 bg-transparent py-2.5 text-center font-pixel text-lg outline-none"
                      style={{ color: game.accent, borderColor: game.accent }}
                      aria-label="Enter initials"
                    />
                    <PixelBtn accent={game.accent} onClick={submitInitials}>
                      ✓ SAVE
                    </PixelBtn>
                  </div>
                </div>
              ) : (
                <div className="ark-scroll flex max-h-44 w-64 flex-col items-center gap-1 overflow-y-auto">
                  {getHighScores(game.id).length === 0 ? (
                    <div className="text-sm ark-dim">{t.game.noScores}</div>
                  ) : (
                    getHighScores(game.id).map((s, i) => {
                      const mine = savedRank === i + 1;
                      return (
                        <div
                          key={s.date + "" + i}
                          className={`flex w-full justify-between rounded-md px-2 py-0.5 font-term text-base ${mine ? "ark-accent" : "ark-text"}`}
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

              <div className="mt-1 flex flex-wrap justify-center gap-2">
                <PixelBtn accent={game.accent} onClick={() => { playSfx("confirm"); startRun(); }}>
                  <RotateCcw size={11} /> {t.game.retry}
                </PixelBtn>
                <PixelBtn accent={game.accent2} onClick={() => { playSfx("back"); setPhase("settings"); }}>
                  <Settings2 size={11} /> {t.game.backToSettings}
                </PixelBtn>
                <PixelBtn accent="var(--dim)" onClick={() => { playSfx("back"); goHome(); }}>
                  <X size={11} /> {t.game.quit}
                </PixelBtn>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* touch hint footer */}
      <div
        className="hidden shrink-0 justify-center py-1.5 font-term text-sm md:flex"
        style={{ color: "var(--dim)", background: "rgba(0,0,0,0.25)" }}
      >
        {t.game.pausedHint} · {game.controls[0]}
      </div>
    </div>
  );
}

/* ---------------- shared header for intro/settings ---------------- */

function GameHeader({ game }: { game: GameDefinition }) {
  const t = useT();
  return (
    <div
      className="flex shrink-0 items-center justify-between border-b px-3 py-2.5 sm:px-5"
      style={{ borderColor: "var(--border)", background: "var(--bg-2)" }}
    >
      <button
        onClick={() => {
          playSfx("back");
          navigate("/");
        }}
        className="flex items-center gap-1.5 rounded-lg border px-3 py-2 font-pixel text-[8px] transition-colors no-touch-highlight"
        style={{ borderColor: "var(--border)", color: "var(--dim)" }}
      >
        <ChevronLeft size={12} />
        {t.game.backToLibrary}
      </button>
      <div
        className="font-pixel text-[9px] sm:text-xs"
        style={{ color: game.accent, textShadow: `0 0 12px ${game.accent}66` }}
      >
        {game.title}
      </div>
    </div>
  );
}

/* Lazy game component map — populated in games/index.tsx */
import { GAME_COMPONENTS } from "../index";
