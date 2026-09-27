"use client";

/**
 * Client-side helpers for the global leaderboard API.
 * All requests fail soft — the console keeps working offline
 * with device-local scores.
 */

export interface GlobalScore {
  name: string;
  score: number;
  difficulty: string;
  date: number;
}

export type GlobalSource = "kv" | "db" | "none";

export type GlobalBoards = Record<string, GlobalScore[]>;

const TIMEOUT_MS = 6000;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      cache: "no-store",
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

/** Fetches all global boards. Returns null on network/API failure. */
export function fetchGlobalBoards(): Promise<{ source: GlobalSource; boards: GlobalBoards } | null> {
  return fetchJson<{ source: GlobalSource; boards: GlobalBoards }>("/api/scores");
}

export interface SubmitResult {
  ok: boolean;
  /** 1-based global rank if the entry made the world top-10 */
  rank: number | null;
}

/** Posts a finished run to the world board. Returns null on failure. */
export function submitGlobalScore(payload: {
  gameId: string;
  name: string;
  score: number;
  difficulty: string;
  date: number;
}): Promise<SubmitResult | null> {
  return fetchJson<SubmitResult>("/api/scores", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
