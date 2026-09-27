"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe2, HardDrive, RefreshCw, WifiOff } from "lucide-react";
import { GAMES } from "@/lib/games/registry";
import { getHighScores } from "@/lib/storage/highscores";
import { fetchGlobalBoards, type GlobalBoards } from "@/lib/api/scores";
import { useT } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { playSfx } from "@/lib/audio/chiptune";

interface HighScore {
  name: string;
  score: number;
  difficulty: string;
  date: number;
}

type BoardTab = "world" | "device";

const INITIALS_KEY = "arkin4.lastname.v1";

export function ScoresPage() {
  const t = useT();
  const [tab, setTab] = useState<BoardTab>("world");
  const [deviceDb, setDeviceDb] = useState<Record<string, HighScore[]>>({});
  const [globalBoards, setGlobalBoards] = useState<GlobalBoards | null>(null);
  const [globalState, setGlobalState] = useState<"loading" | "ok" | "fail">("loading");

  const loadDevice = useCallback(() => {
    const next: Record<string, HighScore[]> = {};
    for (const g of GAMES) next[g.id] = getHighScores(g.id);
    setDeviceDb(next);
  }, []);

  const loadGlobal = useCallback(async () => {
    setGlobalState("loading");
    const res = await fetchGlobalBoards();
    if (res && res.boards) {
      setGlobalBoards(res.boards);
      setGlobalState("ok");
    } else {
      setGlobalState("fail");
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      loadDevice();
      void loadGlobal();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadDevice, loadGlobal]);

  const lastInitials = (() => {
    try {
      return window.localStorage.getItem(INITIALS_KEY) ?? "";
    } catch {
      return "";
    }
  })();

  const activeBoards: Record<string, HighScore[]> =
    tab === "world" && globalState === "ok" && globalBoards
      ? globalBoards
      : deviceDb;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-7 text-center">
        <h1 className="font-pixel text-base sm:text-xl">
          <span className="ark-text">HALL OF </span>
          <span
            style={{ color: "var(--warn)", textShadow: "0 0 20px rgba(251,191,36,0.45)" }}
          >
            FAME
          </span>
        </h1>
        <p className="mt-3 text-sm ark-dim sm:text-base">{t.scores.sub}</p>
      </header>

      {/* board source toggle */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        <div
          className="flex rounded-xl border p-1"
          style={{ borderColor: "var(--border)", background: "var(--panel)" }}
          role="tablist"
          aria-label="Leaderboard source"
        >
          <TabBtn
            active={tab === "world"}
            onClick={() => {
              playSfx("select");
              setTab("world");
              if (globalState === "fail") void loadGlobal();
            }}
            icon={<Globe2 size={12} />}
            label={t.scores.world}
          />
          <TabBtn
            active={tab === "device"}
            onClick={() => {
              playSfx("select");
              loadDevice();
              setTab("device");
            }}
            icon={<HardDrive size={12} />}
            label={t.scores.device}
          />
        </div>

        {tab === "world" && (
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-pixel text-[6px]"
              style={{
                borderColor:
                  globalState === "ok" ? "var(--ok)" : "var(--border)",
                color:
                  globalState === "ok" ? "var(--ok)" : "var(--dim)",
              }}
              role="status"
            >
              {globalState === "ok" ? (
                <>
                  <span className="inline-block h-1.5 w-1.5 rounded-full blink" style={{ background: "var(--ok)" }} />
                  {t.scores.live}
                </>
              ) : (
                <>{t.scores.loading}</>
              )}
            </span>
            <button
              onClick={() => {
                playSfx("select");
                void loadGlobal();
              }}
              className="icon-btn h-8 w-8"
              aria-label={t.scores.refresh}
              title={t.scores.refresh}
            >
              <RefreshCw size={13} className={globalState === "loading" ? "animate-spin" : ""} />
            </button>
          </div>
        )}
      </div>

      {/* offline banner */}
      {tab === "world" && globalState === "fail" && (
        <div
          className="mx-auto mb-6 flex max-w-xl items-center justify-center gap-2.5 rounded-xl border px-4 py-3 text-center text-sm"
          style={{ borderColor: "var(--warn)", color: "var(--warn)", background: "rgba(251,191,36,0.08)" }}
          role="alert"
        >
          <WifiOff size={15} className="shrink-0" />
          {t.scores.offline}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {GAMES.map((g, i) => {
          const list = activeBoards[g.id] ?? [];
          const isWorld = tab === "world" && globalState === "ok";
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
                {/* loading skeletons */}
                {(tab === "world" && globalState === "loading") ? (
                  <ol className="flex flex-col gap-1.5 p-1" aria-busy="true">
                    {Array.from({ length: 4 }).map((_, k) => (
                      <li
                        key={k}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                      >
                        <span
                          className="h-3 w-7 animate-pulse rounded"
                          style={{ background: "var(--border)" }}
                        />
                        <span
                          className="h-3 w-14 animate-pulse rounded"
                          style={{ background: "var(--border)" }}
                        />
                        <span
                          className="ml-auto h-3 w-16 animate-pulse rounded"
                          style={{ background: "var(--border)" }}
                        />
                      </li>
                    ))}
                  </ol>
                ) : list.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <span className="text-2xl opacity-60" aria-hidden>
                      👾
                    </span>
                    <span className="text-sm ark-dim">{t.scores.empty}</span>
                  </div>
                ) : (
                  <ol className="flex flex-col gap-0.5 p-1">
                    {list.map((s, idx) => {
                      const mine =
                        isWorld &&
                        lastInitials.length === 3 &&
                        s.name === lastInitials &&
                        Date.now() - s.date < 1000 * 60 * 60 * 24 * 7;
                      return (
                        <li
                          key={s.date + "-" + idx}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 font-term text-base transition-colors hover:bg-[var(--panel-2)] ${
                            mine ? "ark-accent" : ""
                          }`}
                          style={mine ? { background: "rgba(176,38,255,0.10)" } : undefined}
                        >
                          <span
                            className="w-7 font-pixel text-[8px]"
                            style={{
                              color:
                                idx === 0
                                  ? "var(--medal-1)"
                                  : idx === 1
                                    ? "var(--medal-2)"
                                    : idx === 2
                                      ? "var(--medal-3)"
                                      : "var(--dim)",
                            }}
                          >
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span className="font-pixel text-[10px] ark-text">{s.name}</span>
                          {mine && (
                            <span
                              className="rounded border px-1.5 py-0.5 font-pixel text-[6px]"
                              style={{ borderColor: "var(--neon)", color: "var(--neon-soft)" }}
                            >
                              {t.scores.you}
                            </span>
                          )}
                          <span className="ml-auto ark-dim text-xs">
                            {s.difficulty.toUpperCase()}
                          </span>
                          <span
                            className="w-20 text-right font-bold"
                            style={{ color: g.accent }}
                          >
                            {String(s.score).padStart(6, "0")}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>

              {/* card footer: source label */}
              <div
                className="border-t px-4 py-2 text-center font-pixel text-[6px]"
                style={{ borderColor: "var(--border)", color: "var(--dim)" }}
              >
                {tab === "world"
                  ? globalState === "ok"
                    ? t.scores.live
                    : globalState === "loading"
                      ? t.scores.loading
                      : t.scores.offline
                  : t.scores.local}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-pixel text-[8px] transition-all no-touch-highlight"
      style={{
        color: active ? "var(--text)" : "var(--dim)",
        background: active ? "rgba(176,38,255,0.14)" : "transparent",
        boxShadow: active ? "0 0 16px -6px var(--neon-glow)" : "none",
        border: `1px solid ${active ? "var(--neon)" : "transparent"}`,
      }}
    >
      {icon}
      {label}
    </button>
  );
}
