// ARKIN-IV i18n — default language: English (fa and others coming later)

export const en = {
  console: {
    title: "ARKIN-IV",
    version: "ARKIN-DOS 1.0",
    prompt: "C:\\ARKIN4>",
    ready: "TYPE HELP FOR COMMANDS — OR USE THE SHORTCUTS BELOW",
    shortcuts: {
      games: "GAMES",
      scores: "SCORES",
      settings: "SETTINGS",
      trophies: "TROPHIES",
      about: "ABOUT",
    },
    backToTerminal: "EXIT TO TERMINAL",
  },
  commands: {
    unknown: (cmd: string) => `COMMAND NOT FOUND: ${cmd} — TRY 'HELP'`,
  },
  game: {
    insert: "INSERT CARTRIDGE",
    start: "START GAME",
    settings: "CARTRIDGE SETTINGS",
    difficulty: "DIFFICULTY",
    resume: "RESUME",
    restart: "RESTART",
    quit: "QUIT TO TERMINAL",
    pause: "PAUSED",
    gameOver: "GAME OVER",
    score: "SCORE",
    hiScore: "HI-SCORE",
    newRecord: "NEW RECORD!",
    enterInitials: "ENTER YOUR INITIALS",
    retry: "RETRY",
    backToSettings: "SETTINGS",
    controls: "CONTROLS",
    noScores: "NO SCORES YET — BE THE FIRST LEGEND",
    pausedHint: "P / ESC = PAUSE",
  },
  trophies: {
    title: "TROPHY ROOM",
    locked: "LOCKED",
    unlocked: "UNLOCKED",
  },
  settings: {
    title: "SYSTEM SETTINGS",
    theme: "COLOR THEME",
    crt: "CRT EFFECT",
    scanlines: "SCANLINES",
    flicker: "FLICKER",
    volume: "SOUND VOLUME",
    language: "LANGUAGE",
    comingSoon: "COMING SOON",
  },
  boot: {
    skip: "PRESS ANY KEY TO SKIP",
  },
} as const;

export type Dictionary = typeof en;

export const dictionaries: Record<string, Dictionary> = { en };
