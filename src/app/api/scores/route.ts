import { NextRequest, NextResponse } from "next/server";
import {
  addGlobalScore,
  getAllGlobalScores,
  getGlobalScores,
} from "@/lib/scores/store";

/**
 * Global leaderboard API.
 *
 * GET  /api/scores              → { source, boards: { snake: [...], ... } }
 * GET  /api/scores?game=snake   → { source, scores: [...] }
 * POST /api/scores              → { ok, rank, source }
 *      body: { gameId, name, score, difficulty }
 */

export const dynamic = "force-dynamic";

/* ---------------- tiny in-memory rate limit (spam guard) ---------------- */

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_POSTS = 12;
const rateMap = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rateMap.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  rateMap.set(ip, hits);
  if (rateMap.size > 5000) {
    // keep the map bounded
    for (const [k, v] of rateMap) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) rateMap.delete(k);
    }
  }
  return hits.length > RATE_MAX_POSTS;
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local"
  );
}

/* ---------------- validation ---------------- */

const GAME_IDS = ["snake", "muncher", "blockfall", "pong"] as const;
const NAME_RE = /^[A-Z0-9]{1,3}$/;

function parsePost(body: unknown):
  | { ok: true; data: { gameId: string; name: string; score: number; difficulty: string; date: number } }
  | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid body" };
  }
  const b = body as Record<string, unknown>;
  const gameId = String(b.gameId ?? "");
  if (!(GAME_IDS as readonly string[]).includes(gameId)) {
    return { ok: false, error: "Unknown gameId" };
  }
  const name = String(b.name ?? "AAA").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3) || "AAA";
  const score = Math.floor(Number(b.score));
  if (!Number.isFinite(score) || score < 0 || score > 99_999_999) {
    return { ok: false, error: "Invalid score" };
  }
  const difficulty = String(b.difficulty ?? "normal").slice(0, 24);
  const date = Math.floor(Number(b.date) || Date.now());
  return { ok: true, data: { gameId, name, score, difficulty, date } };
}

/* ---------------- handlers ---------------- */

export async function GET(req: NextRequest) {
  const game = req.nextUrl.searchParams.get("game");
  try {
    if (game) {
      const { source, scores } = await getGlobalScores(game);
      return NextResponse.json(
        { source, scores },
        { headers: { "cache-control": "no-store" } }
      );
    }
    const { source, boards } = await getAllGlobalScores();
    return NextResponse.json(
      { source, boards },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { source: "none", error: "Leaderboard unavailable" },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json(
      { ok: false, error: "Slow down, champ" },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parsePost(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  try {
    const { source, rank } = await addGlobalScore(parsed.data.gameId, {
      name: parsed.data.name,
      score: parsed.data.score,
      difficulty: parsed.data.difficulty,
      date: parsed.data.date,
    });
    if (source === "none") {
      return NextResponse.json(
        { ok: false, error: "Leaderboard unavailable" },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true, rank, source });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Leaderboard unavailable" },
      { status: 503 }
    );
  }
}
