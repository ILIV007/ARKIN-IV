"use client";

import type { GameDefinition } from "@/lib/games/registry";

/**
 * Contract every cartridge component must implement.
 * The GameShell owns: intro, settings, HUD, pause, game-over, high-scores.
 * The game owns: canvas, loop, input, sounds.
 */
export interface GameProps {
  game: GameDefinition;
  /** resolved settings from the cartridge settings screen */
  settings: Record<string, string | boolean>;
  /** resolved difficulty value (e.g. "arcade") */
  difficulty: string;
  /** true while pause overlay is shown — freeze all simulation */
  paused: boolean;
  /** report score changes for the HUD */
  onScore: (score: number) => void;
  /** report extra HUD stats (e.g. "LV 3", "LIVES 2") */
  onHudStats: (stats: string) => void;
  /** call exactly once when the run ends */
  onGameOver: (score: number) => void;
  /** optional: report internal game context to the shell (for achievements) */
  onEvent?: (event: string) => void;
}
