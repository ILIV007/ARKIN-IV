"use client";

import { toast } from "sonner";
import { playSfx } from "@/lib/audio/chiptune";

/**
 * ARKIN-IV Trophy System — cross-game achievements, persisted locally.
 */

export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  icon: string; // emoji
  secret?: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_boot", title: "Power On", desc: "Boot the ARKIN-IV for the first time", icon: "⚡" },
  { id: "first_run", title: "Cartridge Collector", desc: "Run your first game cartridge", icon: "🎮" },
  { id: "theme_switcher", title: "Mood Swinger", desc: "Try both color themes", icon: "🎨" },
  { id: "konami", title: "↑↑↓↓←→←→BA", desc: "An old code from a distant past", icon: "🕹️", secret: true },
  { id: "snake_first", title: "Hiss", desc: "Play SERPENT.EXE", icon: "🐍" },
  { id: "snake_apples_10", title: "Orchard Raider", desc: "Eat 10 apples in one run", icon: "🍎" },
  { id: "snake_apples_25", title: "Anaconda", desc: "Eat 25 apples in one run", icon: "🐍" },
  { id: "snake_nightmare", title: "Nightmare Driver", desc: "Score 150+ on Nightmare difficulty", icon: "💀" },
  { id: "muncher_first", title: "Waka Waka", desc: "Play MUNCHER-84", icon: "👻" },
  { id: "muncher_ghosts_4", title: "Ghost Buster", desc: "Clear 4-ghost mode once", icon: "🧹" },
  { id: "muncher_power", title: "Power Trip", desc: "Eat 3 ghosts with a single power pellet", icon: "⚡" },
  { id: "tetris_first", title: "Block Party", desc: "Play BLOCKFALL", icon: "🧱" },
  { id: "tetris_tetris", title: "TETRABYTE!", desc: "Clear 4 lines at once", icon: "💥" },
  { id: "tetris_level_5", title: "Speed Demon", desc: "Reach level 5 in BLOCKFALL", icon: "🏎️" },
  { id: "pong_first", title: "First Serve", desc: "Play PONG-72", icon: "🏓" },
  { id: "pong_win_hard", title: "The Wall", desc: "Beat the AI on hard difficulty", icon: "🧱" },
  { id: "all_games", title: "Full Shelf", desc: "Play all 4 cartridges", icon: "🏆" },
  { id: "score_500", title: "High Voltage", desc: "Score 500+ in any game", icon: "🔥" },
];

const KEY = "arkin4.achievements.v1";

export function getUnlockedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function persistUnlocked(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

/** Unlocks an achievement. Returns true if it was newly unlocked (fires toast). */
export function unlockAchievement(id: string): boolean {
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (!def) return false;
  const unlocked = getUnlockedIds();
  if (unlocked.includes(id)) return false;
  persistUnlocked([...unlocked, id]);
  playSfx("achieve");
  toast(def.icon + "  TROPHY UNLOCKED — " + def.title, {
    description: def.desc,
    duration: 4200,
    style: {
      background: "var(--panel)",
      border: "1px solid var(--border-2)",
      color: "var(--text)",
      fontFamily: "var(--font-grotesk), sans-serif",
      fontSize: "14px",
    },
  });
  return true;
}
