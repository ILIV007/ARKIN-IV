/**
 * ARKIN-IV Cartridge Registry.
 * Every game is a "cartridge": its own world, settings schema, difficulty tiers
 * and score achievements. Adding a new game = add an entry here + a component.
 */

export interface SelectOption {
  value: string;
  label: string;
}

export interface GameSettingDef {
  key: string;
  label: string;
  type: "select" | "toggle";
  options?: SelectOption[];
  default: string | boolean;
}

export interface GameDefinition {
  id: string;
  title: string; // displayed cartridge title
  tagline: string;
  lore: string;
  controls: string[];
  accent: string; // hex accent for world/canvas
  accent2: string;
  worldName: string;
  worldBg: string; // css gradient for world screens
  asciiArt: string;
  settings: GameSettingDef[];
  difficulty: SelectOption[];
  /** score milestones → achievements (checked by GameShell on game over) */
  scoreAchievements?: { score: number; achievementId: string }[];
  /** hook called on game over for custom achievements (advanced) */
  customGameOver?: never;
}

export const GAMES: GameDefinition[] = [
  {
    id: "snake",
    title: "SERPENT.EXE",
    tagline: "Eat. Grow. Don't bite yourself.",
    lore: "YEAR 2087: Bio-lab serpent escaped into the neon grid. Feed it data-apples before the system crashes. Each apple makes it longer, faster, hungrier.",
    controls: [
      "ARROWS / WASD — steer",
      "P — pause",
      "SWIPE / D-PAD on mobile",
    ],
    accent: "#4ade80",
    accent2: "#22d3ee",
    worldName: "NEON SERPENTARIUM",
    worldBg: "linear-gradient(160deg,#07110f 0%,#0b1a2e 100%)",
    asciiArt: [
      "   _____",
      "  /  _  \\ __ _  ___ _ __  ___  ___",
      "  | | | |/ _` |/ _ \\ '_ \\ / _ \\/ __|",
      "  | |_| | (_| |  __/ | | | (_) \\__ \\",
      "  \\_____|\\__,_|\\___|_| |_|\\___/|___/",
    ].join("\n"),
    settings: [
      {
        key: "speed",
        label: "SPEED",
        type: "select",
        options: [
          { value: "slow", label: "SLOW" },
          { value: "normal", label: "NORMAL" },
          { value: "fast", label: "FAST" },
          { value: "insane", label: "INSANE" },
        ],
        default: "normal",
      },
      {
        key: "board",
        label: "BOARD SIZE",
        type: "select",
        options: [
          { value: "small", label: "SMALL 15x15" },
          { value: "normal", label: "NORMAL 21x21" },
          { value: "large", label: "LARGE 27x27" },
        ],
        default: "normal",
      },
      {
        key: "walls",
        label: "WALLS",
        type: "select",
        options: [
          { value: "solid", label: "SOLID (DEATH)" },
          { value: "wrap", label: "WARP TUNNELS" },
        ],
        default: "solid",
      },
      {
        key: "goldenApple",
        label: "GOLDEN APPLES",
        type: "toggle",
        default: true,
      },
    ],
    difficulty: [
      { value: "rookie", label: "ROOKIE" },
      { value: "arcade", label: "ARCADE" },
      { value: "nightmare", label: "NIGHTMARE" },
    ],
    scoreAchievements: [
      { score: 500, achievementId: "score_500" },
    ],
  },
  {
    id: "muncher",
    title: "MUNCHER-84",
    tagline: "Dot munching. Ghost dodging. 1984.",
    lore: "THE METRO MAZE: deep under Neo-Arkin city, a hungry drone munches energy dots while four rogue AI ghosts patrol the tunnels. Swallow a POWER CELL to turn the tables.",
    controls: [
      "ARROWS / WASD — move",
      "P — pause",
      "SWIPE / D-PAD on mobile",
    ],
    accent: "#fbbf24",
    accent2: "#c084fc",
    worldName: "METRO MAZE 1984",
    worldBg: "linear-gradient(160deg,#0d0a1e 0%,#1a1030 100%)",
    asciiArt: [
      "  __  __ ___ _   _ _____ _____ ___  ___",
      " |  \\/  | __| \\ | | ____|_   _/ _ \\/ __|",
      " | |\\/| | _||  \\| |  _|   | || | | \\__ \\",
      " |_|  |_|___|_|\\__|_____| |_|| |_| |___/",
    ].join("\n"),
    settings: [
      {
        key: "ghosts",
        label: "GHOSTS",
        type: "select",
        options: [
          { value: "2", label: "2 GHOSTS" },
          { value: "3", label: "3 GHOSTS" },
          { value: "4", label: "4 GHOSTS" },
        ],
        default: "4",
      },
      {
        key: "powerTime",
        label: "POWER CELL TIME",
        type: "select",
        options: [
          { value: "4", label: "4s (SHORT)" },
          { value: "6", label: "6s (NORMAL)" },
          { value: "9", label: "9s (LONG)" },
        ],
        default: "6",
      },
      {
        key: "ghostSpeed",
        label: "GHOST SPEED",
        type: "select",
        options: [
          { value: "slow", label: "SLOW" },
          { value: "normal", label: "NORMAL" },
          { value: "fast", label: "FAST" },
        ],
        default: "normal",
      },
      {
        key: "maze",
        label: "MAZE LAYOUT",
        type: "select",
        options: [
          { value: "classic", label: "CLASSIC" },
          { value: "random", label: "RANDOM" },
        ],
        default: "classic",
      },
    ],
    difficulty: [
      { value: "easy", label: "EASY" },
      { value: "normal", label: "NORMAL" },
      { value: "insane", label: "INSANE" },
    ],
    scoreAchievements: [
      { score: 500, achievementId: "score_500" },
    ],
  },
  {
    id: "blockfall",
    title: "BLOCKFALL",
    tagline: "Stack fast. Clear faster.",
    lore: "ORBITAL FREIGHT YARD: malfunctioning cargo blocks rain onto your landing pad. Stack them perfectly to clear lines — or drown in tetromino debris.",
    controls: [
      "← → — move · ↑ / X — rotate",
      "↓ — soft drop · SPACE — hard drop",
      "P — pause",
    ],
    accent: "#22d3ee",
    accent2: "#b026ff",
    worldName: "ORBITAL YARD-7",
    worldBg: "linear-gradient(160deg,#04101c 0%,#0b1030 100%)",
    asciiArt: [
      "  ____  _____ _      _____ ____  _   _",
      " | __ )| ____| |    | ____|  _ \\| \\ | |",
      " |  _ \\|  _| | |    |  _| | |_) |  \\| |",
      " | |_) | |___| |___ | |___|  _ <| |\\  |",
      " |____/|_____|_____|_____|_| \\_\\_| \\_|",
    ].join("\n"),
    settings: [
      {
        key: "ghost",
        label: "GHOST PIECE",
        type: "toggle",
        default: true,
      },
      {
        key: "startLevel",
        label: "START LEVEL",
        type: "select",
        options: [
          { value: "1", label: "LEVEL 1" },
          { value: "3", label: "LEVEL 3" },
          { value: "5", label: "LEVEL 5" },
          { value: "8", label: "LEVEL 8" },
        ],
        default: "1",
      },
      {
        key: "grid",
        label: "YARD GRID",
        type: "toggle",
        default: true,
      },
    ],
    difficulty: [
      { value: "casual", label: "CASUAL" },
      { value: "standard", label: "STANDARD" },
      { value: "brutal", label: "BRUTAL" },
    ],
    scoreAchievements: [
      { score: 500, achievementId: "score_500" },
    ],
  },
  {
    id: "pong",
    title: "PONG-72",
    tagline: "Two paddles. One ball. No mercy.",
    lore: "THE FIRST BATTLE: year 1972, the original duel, rebuilt with neon guts. Rally the photon ball past the machine mind. First to 7 wins.",
    controls: [
      "↑ ↓ / W S — move paddle",
      "P — pause",
      "TOUCH: drag left side",
    ],
    accent: "#c084fc",
    accent2: "#4ade80",
    worldName: "PHOTON COURT",
    worldBg: "linear-gradient(160deg,#0a0714 0%,#141024 100%)",
    asciiArt: [
      "  ____   ___  ____   _   _ _____",
      " |  _ \\ / _ \\|  _ \\ / \\ | | ____|",
      " | |_) | | | | |_) / _ \\| |  _|",
      " |  __/| |_| |  __/ ___ \\ | |___",
      " |_|    \\___/|_| /_/   \\_\\|_____|",
    ].join("\n"),
    settings: [
      {
        key: "targetScore",
        label: "MATCH LENGTH",
        type: "select",
        options: [
          { value: "5", label: "FIRST TO 5" },
          { value: "7", label: "FIRST TO 7" },
          { value: "11", label: "FIRST TO 11" },
        ],
        default: "7",
      },
      {
        key: "ballSpeed",
        label: "BALL SPEED",
        type: "select",
        options: [
          { value: "slow", label: "SLOW" },
          { value: "normal", label: "NORMAL" },
          { value: "fast", label: "FAST" },
        ],
        default: "normal",
      },
      {
        key: "aiIQ",
        label: "AI PERSONALITY",
        type: "select",
        options: [
          { value: "dumb", label: "ROBOT NICOLAS" },
          { value: "normal", label: "MACHINE MIND" },
          { value: "genius", label: "ARKIN BRAIN" },
        ],
        default: "normal",
      },
    ],
    difficulty: [
      { value: "rookie", label: "ROOKIE" },
      { value: "pro", label: "PRO" },
      { value: "legend", label: "LEGEND" },
    ],
    scoreAchievements: [
      { score: 500, achievementId: "score_500" },
    ],
  },
];

export function getGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id);
}

export function defaultSettings(game: GameDefinition): Record<string, string | boolean> {
  const s: Record<string, string | boolean> = {};
  for (const def of game.settings) s[def.key] = def.default;
  return s;
}
