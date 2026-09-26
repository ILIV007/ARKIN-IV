"use client";

import { Play } from "lucide-react";
import type { GameDefinition } from "@/lib/games/registry";
import { getTopScore } from "@/lib/storage/highscores";
import { navigate } from "@/lib/router";
import { playSfx } from "@/lib/audio/chiptune";
import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";

/**
 * GameCard — a "cartridge" in the library shelf.
 * Pixel-art icon, world gradient header, best score, PLAY action.
 */
export function GameCard({ game, index }: { game: GameDefinition; index: number }) {
  const t = useT();
  const [best, setBest] = useState<number | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setBest(getTopScore(game.id)), 0);
    return () => window.clearTimeout(id);
  }, [game.id]);

  return (
    <button
      onClick={() => {
        playSfx("confirm");
        navigate(`#/games/${game.id}`);
      }}
      className="surface card-hover group relative flex flex-col overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon)] no-touch-highlight"
      style={{ animation: `fadeUp 0.55s ${index * 0.08}s both` }}
      aria-label={`Play ${game.title}`}
    >
      {/* world header */}
      <div
        className="relative flex h-32 items-center justify-center overflow-hidden sm:h-36"
        style={{ background: game.worldBg }}
      >
        {/* grid texture */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        {/* glow orb */}
        <div
          className="absolute h-24 w-24 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-125"
          style={{ background: `${game.accent}30` }}
        />
        <div className="floaty relative transition-transform duration-300 group-hover:scale-110">
          <PixelIcon id={game.id} accent={game.accent} accent2={game.accent2} />
        </div>
        {/* world chip */}
        <span
          className="absolute bottom-2 left-2.5 rounded-md border px-2 py-1 font-pixel text-[6px] sm:text-[7px]"
          style={{
            borderColor: `${game.accent}55`,
            color: game.accent,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
          }}
        >
          {game.worldName}
        </span>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3
            className="font-pixel text-[10px] sm:text-[11px]"
            style={{ color: game.accent, textShadow: `0 0 12px ${game.accent}55` }}
          >
            {game.title}
          </h3>
          <span className="font-term text-xs ark-dim">
            {t.home.best}{" "}
            <span style={{ color: "var(--warn)" }}>
              {String(best ?? 0).padStart(6, "0")}
            </span>
          </span>
        </div>
        <p className="text-sm ark-dim leading-snug">{game.tagline}</p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <div className="flex gap-1" aria-hidden>
            {game.difficulty.slice(0, 3).map((d) => (
              <span
                key={d.value}
                className="h-1.5 w-4 rounded-full"
                style={{ background: `${game.accent}44` }}
                title={d.label}
              />
            ))}
          </div>
          <span
            className="flex items-center gap-1.5 rounded-lg border-2 px-3.5 py-2 font-pixel text-[8px] transition-all group-hover:shadow-[0_0_18px_-4px_var(--neon-glow)]"
            style={{ borderColor: game.accent, color: game.accent }}
          >
            <Play size={10} strokeWidth={3} />
            {t.home.play}
          </span>
        </div>
      </div>
    </button>
  );
}

/* ---------------- pixel-art cartridge icons (pure SVG) ---------------- */

function PixelIcon({ id, accent, accent2 }: { id: string; accent: string; accent2: string }) {
  switch (id) {
    case "snake":
      return <SnakeIcon accent={accent} accent2={accent2} />;
    case "muncher":
      return <MuncherIcon accent={accent} accent2={accent2} />;
    case "blockfall":
      return <BlockfallIcon accent={accent} accent2={accent2} />;
    case "pong":
      return <PongIcon accent={accent} accent2={accent2} />;
    default:
      return null;
  }
}

function SnakeIcon({ accent, accent2 }: { accent: string; accent2: string }) {
  // pixel snake + apple
  const s = 10;
  const body: [number, number][] = [
    [1, 3], [2, 3], [3, 3], [4, 3], [4, 4], [4, 5], [3, 5], [2, 5],
  ];
  return (
    <svg width={72} height={72} viewBox="0 0 72 72" aria-hidden>
      {body.map(([x, y], i) => (
        <rect
          key={i}
          x={x * s + 12}
          y={y * s + 8}
          width={s - 1}
          height={s - 1}
          fill={accent}
          rx={2}
          opacity={0.55 + (i / body.length) * 0.45}
        />
      ))}
      <rect x={20} y={29} width={18} height={8} rx={2} fill={accent} opacity={0.95} />
      <circle cx={26} cy={33} r={1.8} fill="#0b1122" />
      {/* apple */}
      <rect x={52} y={16} width={12} height={12} rx={3} fill={accent2} />
      <rect x={56} y={12} width={3} height={5} rx={1} fill={accent2} />
      <rect x={54} y={19} width={4} height={4} rx={1} fill="#fff" opacity={0.5} />
    </svg>
  );
}

function MuncherIcon({ accent, accent2 }: { accent: string; accent2: string }) {
  // pixel ghost
  return (
    <svg width={72} height={72} viewBox="0 0 72 72" aria-hidden>
      <path
        d="M20 54 V34 a16 16 0 0 1 32 0 V54 l-5.3-5 -5.4 5 -5.3-5 -5.3 5 -5.4-5 Z"
        fill={accent2}
      />
      <rect x={27} y={30} width={7} height={9} rx={2} fill="#0b1122" />
      <rect x={38} y={30} width={7} height={9} rx={2} fill="#0b1122" />
      <rect x={29} y={33} width={3.5} height={4} rx={1} fill={accent2} />
      <rect x={40} y={33} width={3.5} height={4} rx={1} fill={accent2} />
      {/* pellets */}
      <circle cx={16} cy={16} r={2.4} fill={accent} />
      <circle cx={56} cy={16} r={2.4} fill={accent} />
      <circle cx={36} cy={12} r={4} fill={accent} opacity={0.9} />
    </svg>
  );
}

function BlockfallIcon({ accent, accent2 }: { accent: string; accent2: string }) {
  const s = 11;
  const cell = (x: number, y: number, fill: string, o = 1) => (
    <rect key={`${x}-${y}-${fill}`} x={16 + x * s} y={14 + y * s} width={s - 1.5} height={s - 1.5} rx={2} fill={fill} opacity={o} />
  );
  return (
    <svg width={72} height={72} viewBox="0 0 72 72" aria-hidden>
      {cell(0, 0, accent)}
      {cell(1, 0, accent)}
      {cell(1, 1, accent)}
      {cell(2, 1, accent)}
      {cell(3.2, 0, accent2, 0.9)}
      {cell(3.2, 1, accent2, 0.9)}
      {cell(3.2, 2, accent2, 0.9)}
      {cell(0.4, 3.2, accent2, 0.55)}
      {cell(1.4, 3.2, accent2, 0.55)}
      {cell(2.4, 3.2, accent2, 0.55)}
      {cell(3.2, 3.2, accent2, 0.55)}
    </svg>
  );
}

function PongIcon({ accent, accent2 }: { accent: string; accent2: string }) {
  return (
    <svg width={72} height={72} viewBox="0 0 72 72" aria-hidden>
      <rect x={14} y={22} width={5} height={28} rx={2} fill={accent} />
      <rect x={53} y={30} width={5} height={28} rx={2} fill={accent2} />
      <rect x={35} y={20} width={7} height={7} rx={1.5} fill="#fff">
        <animate attributeName="x" values="35;40;35" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="y" values="20;42;20" dur="1.6s" repeatCount="indefinite" />
      </rect>
      <line x1={36} y1={6} x2={36} y2={66} stroke={accent} strokeWidth={1.6} strokeDasharray="4 6" opacity={0.4} />
    </svg>
  );
}
