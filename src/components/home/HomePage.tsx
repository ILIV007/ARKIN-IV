"use client";

import { useEffect, useState } from "react";
import { Dices, Trophy } from "lucide-react";
import { GAMES } from "@/lib/games/registry";
import { GameCard } from "./GameCard";
import { navigate } from "@/lib/router";
import { playSfx } from "@/lib/audio/chiptune";
import { getUnlockedIds } from "@/lib/storage/achievements";
import { getHighScores } from "@/lib/storage/highscores";
import { useT } from "@/lib/i18n";
import { useConsoleStore } from "@/store/console-store";

export function HomePage() {
  const t = useT();
  const konami = useConsoleStore((s) => s.konamiUnlocked);
  const [trophyCount, setTrophyCount] = useState(0);
  const [totalBest, setTotalBest] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setTrophyCount(getUnlockedIds().length);
      let max = 0;
      for (const g of GAMES) max = Math.max(max, getHighScores(g.id)[0]?.score ?? 0);
      setTotalBest(max);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const scrollToLibrary = () => {
    playSfx("select");
    document.getElementById("library")?.scrollIntoView({ behavior: "smooth" });
  };

  const randomGame = () => {
    playSfx("confirm");
    const g = GAMES[Math.floor(Math.random() * GAMES.length)];
    navigate(`#/games/${g.id}`);
  };

  return (
    <div className="flex flex-col">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden" aria-label="Hero">
        {/* background decorations */}
        <div className="ark-grid-bg absolute inset-0" aria-hidden />
        <div
          className="absolute -top-24 left-1/4 h-72 w-72 rounded-full blur-[110px]"
          style={{ background: "var(--neon-glow)", opacity: 0.35 }}
          aria-hidden
        />
        <div
          className="absolute top-32 -right-20 h-64 w-64 rounded-full blur-[110px]"
          style={{ background: "rgba(34,211,238,0.18)" }}
          aria-hidden
        />
        {/* floating pixels */}
        <PixelField />

        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24">
          <span
            className="fade-up rounded-full border px-4 py-2 font-pixel text-[7px] sm:text-[8px] ark-dim"
            style={{ borderColor: "var(--border-2)", background: "var(--panel)" }}
          >
            {t.home.badge}
          </span>

          <h1
            className="fade-up mt-6 font-pixel text-3xl leading-[1.25] sm:text-5xl sm:leading-[1.2] lg:text-6xl"
            style={{ animationDelay: "0.08s" }}
          >
            <span className="ark-text">ARKIN </span>
            <span
              className={konami ? "konami-title" : ""}
              style={
                konami
                  ? undefined
                  : {
                      color: "var(--neon-soft)",
                      textShadow: "0 0 30px var(--neon-glow), 0 0 60px var(--neon-glow)",
                    }
              }
            >
              IV
            </span>
          </h1>

          <p
            className="fade-up mt-6 max-w-xl text-balance text-base leading-relaxed ark-dim sm:text-lg"
            style={{ animationDelay: "0.16s" }}
          >
            {t.home.subtitle}
          </p>

          <div
            className="fade-up mt-8 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "0.24s" }}
          >
            <button
              onClick={scrollToLibrary}
              className="btn-pixel pulse-glow px-6 py-4 font-pixel text-[9px] sm:text-[10px]"
              style={{
                background: "linear-gradient(135deg, var(--neon), #7c3aed)",
                borderColor: "var(--neon)",
                color: "#fff",
              }}
            >
              ▶ {t.home.insertCoin}
            </button>
            <button
              onClick={() => {
                playSfx("select");
                navigate("#/trophies");
              }}
              className="btn-pixel flex items-center gap-2 px-5 py-4 font-pixel text-[9px] sm:text-[10px]"
              style={{ color: "var(--warn)", borderColor: "var(--border-2)", background: "var(--panel)" }}
            >
              <Trophy size={13} />
              {t.home.trophyRoom}
            </button>
          </div>

          {/* stat chips */}
          <div
            className="fade-up mt-10 flex flex-wrap items-center justify-center gap-2.5"
            style={{ animationDelay: "0.32s" }}
          >
            <Stat label={t.home.stats.cartridges} value={String(GAMES.length).padStart(2, "0")} />
            <Stat label={t.home.stats.trophies} value={`${trophyCount}/18`} accent="var(--warn)" />
            <Stat label={t.home.stats.hiscore} value={String(totalBest).padStart(6, "0")} accent="var(--cyan)" />
          </div>
        </div>
      </section>

      {/* ============ CARTRIDGE LIBRARY ============ */}
      <section id="library" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6 sm:py-14" aria-label="Cartridge library">
        <div className="mb-7 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-pixel text-sm sm:text-lg ark-text">
              {t.home.libraryTitle}
            </h2>
            <p className="mt-2 text-sm ark-dim sm:text-base">{t.home.librarySub}</p>
          </div>
          <button
            onClick={randomGame}
            className="btn-pixel flex items-center gap-2 px-4 py-3 font-pixel text-[8px]"
            style={{ color: "var(--cyan)", borderColor: "var(--border-2)", background: "var(--panel)" }}
          >
            <Dices size={13} />
            {t.home.randomGame}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
          {GAMES.map((g, i) => (
            <GameCard key={g.id} game={g} index={i} />
          ))}
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14" aria-label="Features">
        <h2 className="text-center font-pixel text-xs sm:text-sm ark-dim">
          {t.home.features.title}
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon="🏆" title={t.home.features.f1t} desc={t.home.features.f1d} color="var(--warn)" />
          <Feature icon="🎖️" title={t.home.features.f2t} desc={t.home.features.f2d} color="var(--neon-soft)" />
          <Feature icon="🎵" title={t.home.features.f3t} desc={t.home.features.f3d} color="var(--cyan)" />
          <Feature icon="📱" title={t.home.features.f4t} desc={t.home.features.f4d} color="var(--ok)" />
        </div>
      </section>

      {/* ============ READY PLAYER CTA ============ */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-14 pt-2 sm:px-6" aria-label="Call to action">
        <div
          className="surface relative overflow-hidden p-8 text-center sm:p-12"
          style={{ background: "linear-gradient(135deg, var(--panel), var(--panel-2))" }}
        >
          <div
            className="absolute -top-16 left-1/2 h-40 w-2/3 -translate-x-1/2 rounded-full blur-[90px]"
            style={{ background: "var(--neon-glow)", opacity: 0.4 }}
            aria-hidden
          />
          <h2 className="relative font-pixel text-base sm:text-2xl ark-text">
            {t.home.readyTitle}
          </h2>
          <p className="relative mt-3 text-sm ark-dim sm:text-base">{t.home.readySub}</p>
          <button
            onClick={randomGame}
            className="btn-pixel pulse-glow relative mt-7 px-7 py-4 font-pixel text-[9px] sm:text-[10px]"
            style={{
              background: "linear-gradient(135deg, var(--neon), #7c3aed)",
              borderColor: "var(--neon)",
              color: "#fff",
            }}
          >
            ▶ {t.home.randomGame}
          </button>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-xl border px-4 py-2.5"
      style={{ borderColor: "var(--border)", background: "var(--panel)" }}
    >
      <span className="font-term text-lg font-bold" style={{ color: accent ?? "var(--text)" }}>
        {value}
      </span>
      <span className="font-pixel text-[7px] ark-dim">{label}</span>
    </div>
  );
}

function Feature({ icon, title, desc, color }: { icon: string; title: string; desc: string; color: string }) {
  return (
    <div className="surface card-hover p-5">
      <div
        className="grid h-11 w-11 place-items-center rounded-xl text-xl"
        style={{ background: `${color}1a`, border: `1px solid ${color}44` }}
        aria-hidden
      >
        {icon}
      </div>
      <h3 className="mt-4 font-semibold ark-text">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed ark-dim">{desc}</p>
    </div>
  );
}

/** A handful of drifting pixel squares in the hero background. */
function PixelField() {
  const pixels = [
    { top: "18%", left: "8%", size: 8, delay: "0s", color: "var(--neon-soft)" },
    { top: "62%", left: "12%", size: 6, delay: "1.2s", color: "var(--cyan)" },
    { top: "30%", left: "88%", size: 7, delay: "0.6s", color: "var(--neon-soft)" },
    { top: "70%", left: "82%", size: 9, delay: "1.8s", color: "var(--cyan)" },
    { top: "12%", left: "60%", size: 5, delay: "2.4s", color: "var(--warn)" },
    { top: "80%", left: "45%", size: 6, delay: "0.9s", color: "var(--neon-soft)" },
  ];
  return (
    <div className="absolute inset-0" aria-hidden>
      {pixels.map((p, i) => (
        <span
          key={i}
          className="floaty absolute rounded-[2px]"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: 0.5,
            animationDelay: p.delay,
            boxShadow: `0 0 12px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}
