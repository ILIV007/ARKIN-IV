"use client";

import { GAMES, getGame } from "@/lib/games/registry";
import { getHighScores } from "@/lib/storage/highscores";
import { unlockAchievement } from "@/lib/storage/achievements";
import type { ArkTheme, CrtIntensity } from "@/store/console-store";

export type OutputKind =
  | "cmd"
  | "out"
  | "ok"
  | "err"
  | "dim"
  | "accent"
  | "art"
  | "title";

export interface OutputLine {
  text: string;
  kind: OutputKind;
}

export interface CommandContext {
  navigate: (path: string) => void;
  clear: () => void;
  reboot: () => void;
  setTheme: (t: ArkTheme) => void;
  setCrt: (v: CrtIntensity) => void;
  setSound: (on: boolean) => void;
  commandCount: number;
}

export interface CommandResult {
  lines: OutputLine[];
  navigateTo?: string;
  action?: "clear" | "reboot";
}

const HELP_LINES: [string, string][] = [
  ["HELP", "list all commands"],
  ["GAMES / LS", "open the cartridge shelf"],
  ["RUN <game>", "insert & play a cartridge (e.g. RUN SNAKE)"],
  ["INFO <game>", "lore + controls of a cartridge"],
  ["SCORES [game]", "high-score tables"],
  ["TROPHIES", "trophy room"],
  ["SETTINGS", "system settings"],
  ["THEME <name>", "neon-night · pure-white · phosphor-green · amber-crt"],
  ["CRT <level>", "off · low · high"],
  ["SOUND <on|off>", "chip audio toggle"],
  ["ABOUT", "the story of ARKIN-IV"],
  ["CLEAR", "wipe the screen"],
  ["REBOOT", "replay the boot sequence"],
  ["DATE / WHOAMI", "system info"],
];

const ABOUT_ART = [
  "ARKIN-IV ENTERTAINMENT SYSTEM",
  "=============================",
  "",
  "Forged in 1987 by the ARKIN CORP., the IV was the last",
  "console ever built with a heart. Its cartridges hold",
  "worlds; its CRT holds memories. It slept for decades...",
  "now it boots again, inside your browser.",
  "",
  "4 cartridges detected. Dozens of trophies await.",
  "The grid is yours, player.",
];

function artLines(arr: string[], kind: OutputKind): OutputLine[] {
  return arr.map((text) => ({ text, kind }));
}

function unknown(cmd: string): CommandResult {
  return {
    lines: [
      { text: `COMMAND NOT FOUND: ${cmd}`, kind: "err" },
      { text: "TRY 'HELP' TO LIST ALL COMMANDS", kind: "dim" },
    ],
  };
}

function scoresFor(gameId?: string): OutputLine[] {
  const games = gameId ? [getGame(gameId)] : GAMES;
  const defined = games.filter((g): g is NonNullable<typeof g> => Boolean(g));
  if (defined.length === 0)
    return [{ text: `UNKNOWN GAME: ${gameId}`, kind: "err" }];
  const lines: OutputLine[] = [];
  for (const g of defined) {
    lines.push({ text: `▄▄ ${g.title} ▄▄`, kind: "title" });
    const hs = getHighScores(g.id);
    if (hs.length === 0) {
      lines.push({ text: "  (no scores yet — be the first legend)", kind: "dim" });
    } else {
      hs.slice(0, 10).forEach((s, i) => {
        const rank = String(i + 1).padStart(2, "0");
        lines.push({
          text: `  ${rank}. ${s.name.padEnd(3, " ")}  ${String(s.score).padStart(6, " ")}  ${s.difficulty.toUpperCase()}`,
          kind: i === 0 ? "ok" : "out",
        });
      });
    }
    lines.push({ text: "", kind: "dim" });
  }
  lines.push({ text: "TIP: type RUN <game> to beat these records.", kind: "dim" });
  return lines;
}

export function runCommand(input: string, ctx: CommandContext): CommandResult {
  const raw = input.trim();
  if (!raw) return { lines: [] };
  const parts = raw.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const arg = parts.slice(1).join(" ").toLowerCase();

  if (ctx.commandCount === 9) {
    unlockAchievement("terminal_explorer");
  }

  switch (cmd) {
    case "help":
    case "?": {
      const lines: OutputLine[] = [
        { text: "AVAILABLE COMMANDS", kind: "title" },
        { text: "", kind: "dim" },
      ];
      for (const [c, d] of HELP_LINES) {
        lines.push({ text: `  ${c.padEnd(16, " ")} ${d}`, kind: "out" });
      }
      lines.push({ text: "", kind: "dim" });
      lines.push({
        text: "HINT: TAB autocompletes · ↑/↓ history · cartridges: " +
          GAMES.map((g) => g.id.toUpperCase()).join(", "),
        kind: "dim",
      });
      return { lines };
    }

    case "games":
    case "ls":
    case "dir":
      return {
        lines: [
          { text: "OPENING CARTRIDGE SHELF...", kind: "ok" },
          {
            text: GAMES.map((g) => g.title).join("  ·  "),
            kind: "dim",
          },
        ],
        navigateTo: "/games",
      };

    case "run":
    case "play": {
      const game = getGame(arg);
      if (!game) {
        return {
          lines: [
            { text: `CARTRIDGE NOT FOUND: ${arg || "(empty)"}`, kind: "err" },
            {
              text: `AVAILABLE: ${GAMES.map((g) => g.id).join(", ")}`,
              kind: "dim",
            },
          ],
        };
      }
      unlockAchievement("first_run");
      return {
        lines: [
          { text: `INSERTING CARTRIDGE: ${game.title}`, kind: "ok" },
          { text: game.worldName, kind: "accent" },
        ],
        navigateTo: `/games/${game.id}`,
      };
    }

    case "info": {
      const game = getGame(arg);
      if (!game) return unknown("INFO " + arg);
      const infoLines: OutputLine[] = [
        { text: game.title, kind: "title" },
        { text: `WORLD: ${game.worldName}`, kind: "accent" },
        { text: "", kind: "dim" },
        ...artLines(game.lore.match(/.{1,58}(\s|$)/g) ?? [game.lore], "out"),
        { text: "", kind: "dim" },
        { text: "CONTROLS:", kind: "ok" },
        ...game.controls.map((c): OutputLine => ({ text: `  ${c}`, kind: "out" })),
      ];
      return { lines: infoLines };
    }

    case "scores":
    case "highscores":
    case "hiscores":
      return { lines: scoresFor(arg || undefined) };

    case "trophies":
      return {
        lines: [{ text: "ENTERING TROPHY ROOM...", kind: "ok" }],
        navigateTo: "/trophies",
      };

    case "settings":
      return {
        lines: [{ text: "OPENING SYSTEM SETTINGS...", kind: "ok" }],
        navigateTo: "/settings",
      };

    case "theme": {
      const themes: ArkTheme[] = [
        "neon-night",
        "pure-white",
        "phosphor-green",
        "amber-crt",
      ];
      if (!arg) {
        return {
          lines: [
            { text: `USAGE: THEME <name>`, kind: "out" },
            { text: `THEMES: ${themes.join(" · ")}`, kind: "dim" },
          ],
        };
      }
      if (!themes.includes(arg as ArkTheme)) {
        return {
          lines: [
            { text: `UNKNOWN THEME: ${arg}`, kind: "err" },
            { text: `THEMES: ${themes.join(" · ")}`, kind: "dim" },
          ],
        };
      }
      ctx.setTheme(arg as ArkTheme);
      return {
        lines: [
          { text: `THEME APPLIED: ${arg.toUpperCase()}`, kind: "ok" },
          { text: "Try all four in SETTINGS to unlock a trophy.", kind: "dim" },
        ],
      };
    }

    case "crt": {
      const levels: CrtIntensity[] = ["off", "low", "high"];
      if (!levels.includes(arg as CrtIntensity)) {
        return {
          lines: [{ text: "USAGE: CRT <off|low|high>", kind: "dim" }],
        };
      }
      ctx.setCrt(arg as CrtIntensity);
      return { lines: [{ text: `CRT INTENSITY: ${arg.toUpperCase()}`, kind: "ok" }] };
    }

    case "sound":
    case "audio": {
      const on = arg === "on" || arg === "1";
      const off = arg === "off" || arg === "0";
      if (!on && !off) {
        return { lines: [{ text: "USAGE: SOUND <on|off>", kind: "dim" }] };
      }
      ctx.setSound(on);
      return { lines: [{ text: `SOUND: ${on ? "ON" : "OFF"}`, kind: "ok" }] };
    }

    case "about":
      return {
        lines: [
          ...ABOUT_ART.map((t, i) => ({
            text: t,
            kind: i === 0 ? ("title" as OutputKind) : ("out" as OutputKind),
          })),
          { text: "", kind: "dim" },
          { text: "TYPE 'GAMES' TO PICK A CARTRIDGE.", kind: "accent" },
        ],
      };

    case "clear":
    case "cls":
      return { lines: [], action: "clear" };

    case "reboot":
    case "restart":
      return { lines: [{ text: "REBOOTING SYSTEM...", kind: "ok" }], action: "reboot" };

    case "date":
      return {
        lines: [
          { text: new Date().toString(), kind: "out" },
          { text: "(time flies on 8-bit clocks too)", kind: "dim" },
        ],
      };

    case "whoami":
      return {
        lines: [
          { text: "PLAYER ONE", kind: "ok" },
          { text: "the chosen joystick operator", kind: "dim" },
        ],
      };

    case "lang":
    case "language":
      return {
        lines: [
          { text: "CURRENT LANGUAGE: ENGLISH", kind: "ok" },
          { text: "MORE LANGUAGES: COMING SOON (FA, ...)", kind: "dim" },
        ],
      };

    case "hack":
      unlockAchievement("hacker");
      return {
        lines: [
          { text: "BYPASSING ARKIN MAINFRAME...", kind: "accent" },
          { text: "████████████░░░░ 62%", kind: "out" },
          { text: "ACCESS GRANTED. Just kidding — it's your console.", kind: "ok" },
          { text: "You found a secret trophy! 🕶️", kind: "ok" },
        ],
      };

    case "matrix":
      return {
        lines: [
          { text: "FOLLOW THE WHITE RABBIT... 🐇", kind: "ok" },
          { text: "There is no cartridge. There is only PLAY.", kind: "dim" },
        ],
      };

    case "snake":
    case "muncher":
    case "pacman":
    case "blockfall":
    case "tetris":
    case "pong": {
      const idMap: Record<string, string> = {
        pacman: "muncher",
        tetris: "blockfall",
        snake: "snake",
        muncher: "muncher",
        blockfall: "blockfall",
        pong: "pong",
      };
      const game = getGame(idMap[cmd]);
      if (!game) return unknown(cmd);
      unlockAchievement("first_run");
      return {
        lines: [{ text: `INSERTING CARTRIDGE: ${game.title}`, kind: "ok" }],
        navigateTo: `/games/${game.id}`,
      };
    }

    default:
      return unknown(parts[0].toUpperCase());
  }
}

export const COMMAND_NAMES = [
  "help",
  "games",
  "run",
  "info",
  "scores",
  "trophies",
  "settings",
  "theme",
  "crt",
  "sound",
  "about",
  "clear",
  "reboot",
  "date",
  "whoami",
  "lang",
];

export function autoComplete(input: string): string | null {
  const parts = input.split(/\s+/);
  if (parts.length <= 1) {
    const frag = (parts[0] ?? "").toLowerCase();
    if (!frag) return null;
    const match = COMMAND_NAMES.find((c) => c.startsWith(frag) && c !== frag);
    return match ? match : null;
  }
  const frag = parts[parts.length - 1].toLowerCase();
  const ids = GAMES.map((g) => g.id);
  const match = ids.find((g) => g.startsWith(frag) && g !== frag);
  return match ? `${parts.slice(0, -1).join(" ")} ${match}` : null;
}
