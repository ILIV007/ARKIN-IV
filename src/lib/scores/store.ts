import { GAMES } from "@/lib/games/registry";

/**
 * Global leaderboard store.
 *
 * Production (Cloudflare Workers): entries live in the `ARKIN_KV`
 * namespace, one JSON list per game — every visitor sees the same board.
 * Local development / sandbox: falls back to Prisma + SQLite so the
 * exact same API works end-to-end while coding.
 */

export interface GlobalScore {
  name: string;
  score: number;
  difficulty: string;
  date: number; // epoch ms
}

export type ScoreSource = "kv" | "db" | "none";

export const GLOBAL_BOARD_CAP = 10;
export const GAME_IDS = GAMES.map((g) => g.id) as readonly string[];

const KV_PREFIX = "lb:v1:";

/* ---------------- Cloudflare KV binding (optional) ---------------- */

interface KVLike {
  get(key: string, opts: { type: "json" }): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
}

/** Reads the ARKIN_KV binding from the OpenNext Cloudflare context, if any. */
function getKV(): KVLike | null {
  try {
    const sym = Symbol.for("__cloudflare-context__");
    const ctx = (globalThis as Record<symbol, unknown>)[sym] as
      | { env?: { ARKIN_KV?: KVLike } }
      | undefined;
    return ctx?.env?.ARKIN_KV ?? null;
  } catch {
    return null;
  }
}

/* ---------------- Prisma fallback ---------------- */

async function getPrisma() {
  try {
    const mod = await import("@/lib/db");
    return mod.db;
  } catch {
    return null;
  }
}

/* ---------------- ordering helper ---------------- */

/** Classic arcade ordering: higher score first, earlier run wins ties. */
export function sortEntries(list: GlobalScore[]): GlobalScore[] {
  return [...list].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.date - b.date;
  });
}

function sanitize(entry: GlobalScore): GlobalScore {
  return {
    name: String(entry.name ?? "AAA").toUpperCase().slice(0, 3),
    score: Math.max(0, Math.floor(Number(entry.score) || 0)),
    difficulty: String(entry.difficulty ?? "normal").slice(0, 24),
    date: Math.max(0, Math.floor(Number(entry.date) || 0)),
  };
}

/* ---------------- public API ---------------- */

export async function getGlobalScores(
  gameId: string
): Promise<{ source: ScoreSource; scores: GlobalScore[] }> {
  if (!GAME_IDS.includes(gameId)) return { source: "none", scores: [] };

  // 1) Cloudflare KV
  const kv = getKV();
  if (kv) {
    try {
      const raw = (await kv.get(KV_PREFIX + gameId, { type: "json" })) as
        | GlobalScore[]
        | null;
      const list = Array.isArray(raw)
        ? sortEntries(raw).slice(0, GLOBAL_BOARD_CAP)
        : [];
      return { source: "kv", scores: list.map(sanitize) };
    } catch {
      // fall through to DB
    }
  }

  // 2) Prisma / SQLite fallback
  const prisma = await getPrisma();
  if (prisma) {
    try {
      const rows = await prisma.score.findMany({
        where: { gameId },
        orderBy: [{ score: "desc" }, { createdAt: "asc" }],
        take: GLOBAL_BOARD_CAP,
      });
      return {
        source: "db",
        scores: rows.map((r) => ({
          name: r.name,
          score: r.score,
          difficulty: r.difficulty,
          date: r.createdAt.getTime(),
        })),
      };
    } catch {
      // DB unavailable
    }
  }

  return { source: "none", scores: [] };
}

export async function getAllGlobalScores(): Promise<{
  source: ScoreSource;
  boards: Record<string, GlobalScore[]>;
}> {
  const kv = getKV();
  if (kv) {
    const boards: Record<string, GlobalScore[]> = {};
    for (const id of GAME_IDS) {
      const r = await getGlobalScores(id);
      boards[id] = r.scores;
    }
    return { source: "kv", boards };
  }

  const prisma = await getPrisma();
  if (!prisma) return { source: "none", boards: {} };
  try {
    const rows = await prisma.score.findMany({
      orderBy: [{ score: "desc" }, { createdAt: "asc" }],
    });
    const boards: Record<string, GlobalScore[]> = {};
    for (const id of GAME_IDS) {
      boards[id] = rows
        .filter((r) => r.gameId === id)
        .slice(0, GLOBAL_BOARD_CAP)
        .map((r) => ({
          name: r.name,
          score: r.score,
          difficulty: r.difficulty,
          date: r.createdAt.getTime(),
        }));
    }
    return { source: "db", boards };
  } catch {
    return { source: "none", boards: {} };
  }
}

/**
 * Adds an entry to the global board.
 * Returns the 1-based global rank when the entry made the board, else null.
 */
export async function addGlobalScore(
  gameId: string,
  entryRaw: GlobalScore
): Promise<{ source: ScoreSource; rank: number | null }> {
  const entry = sanitize(entryRaw);
  if (!GAME_IDS.includes(gameId)) return { source: "none", rank: null };

  const kv = getKV();
  if (kv) {
    try {
      const raw = (await kv.get(KV_PREFIX + gameId, { type: "json" })) as
        | GlobalScore[]
        | null;
      const list = sortEntries([...(Array.isArray(raw) ? raw : []), entry]);
      const idx = list.findIndex(
        (e) =>
          e.name === entry.name &&
          e.score === entry.score &&
          e.date === entry.date
      );
      const trimmed = list.slice(0, GLOBAL_BOARD_CAP).map(sanitize);
      await kv.put(KV_PREFIX + gameId, JSON.stringify(trimmed));
      return {
        source: "kv",
        rank: idx > -1 && idx < GLOBAL_BOARD_CAP ? idx + 1 : null,
      };
    } catch {
      // KV write failed — try DB as a safety net
    }
  }

  const prisma = await getPrisma();
  if (prisma) {
    try {
      const created = await prisma.score.create({
        data: {
          gameId,
          name: entry.name,
          score: entry.score,
          difficulty: entry.difficulty,
          createdAt: new Date(entry.date || Date.now()),
        },
      });
      const higher = await prisma.score.count({
        where: {
          gameId,
          OR: [
            { score: { gt: entry.score } },
            { score: entry.score, createdAt: { lt: created.createdAt } },
          ],
        },
      });
      const rank = higher + 1;
      return { source: "db", rank: rank <= GLOBAL_BOARD_CAP ? rank : null };
    } catch {
      return { source: "none", rank: null };
    }
  }

  return { source: "none", rank: null };
}
