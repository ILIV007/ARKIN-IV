"use client";

/**
 * High-score storage — arcade style, persisted in localStorage.
 * Top 10 per game, with 3-letter initials (classic!).
 */

export interface HighScore {
  name: string; // 3-letter initials
  score: number;
  difficulty: string;
  date: number;
}

const KEY = "arkin4.scores.v1";
const MAX = 10;

type ScoreDb = Record<string, HighScore[]>;

function readDb(): ScoreDb {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ScoreDb;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeDb(db: ScoreDb) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* storage unavailable */
  }
}

export function getHighScores(gameId: string): HighScore[] {
  return readDb()[gameId] ?? [];
}

export function getTopScore(gameId: string): number {
  const list = getHighScores(gameId);
  return list.length > 0 ? list[0].score : 0;
}

export function isHighScore(gameId: string, score: number): boolean {
  if (score <= 0) return false;
  const list = getHighScores(gameId);
  return list.length < MAX || score > list[list.length - 1].score;
}

/** Saves a score; returns its 1-based rank if it made the board, else null. */
export function saveHighScore(
  gameId: string,
  entry: HighScore
): number | null {
  const db = readDb();
  const list = [...(db[gameId] ?? []), entry].sort(
    (a, b) => b.score - a.score
  );
  const idx = list.findIndex(
    (e) => e.date === entry.date && e.name === entry.name && e.score === entry.score
  );
  if (idx === -1 || idx >= MAX) {
    db[gameId] = list.slice(0, MAX);
    writeDb(db);
    return null;
  }
  db[gameId] = list.slice(0, MAX);
  writeDb(db);
  return idx + 1;
}

export function clearHighScores(gameId?: string) {
  if (!gameId) {
    window.localStorage.removeItem(KEY);
    return;
  }
  const db = readDb();
  delete db[gameId];
  writeDb(db);
}
