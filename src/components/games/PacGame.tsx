"use client";

/**
 * MUNCHER-84 — PAC-MAN-style cartridge for the ARKIN-IV.
 * One handcrafted 19x21 maze, tile-to-tile movement, personality ghosts,
 * power cells, fruit, lives, levels. All sim state lives in useRef.
 */

import { useCallback, useEffect, useRef } from "react";
import type { GameProps } from "./shared/types";
import { DPad, type Dir } from "@/components/console/DPad";
import { playSfx } from "@/lib/audio/chiptune";
import { unlockAchievement } from "@/lib/storage/achievements";

/* ------------------------------------------------------------------ maze */

const COLS = 19;
const ROWS = 21;
const PLAYER_SPEED = 5.5; // tiles/s
const GHOST_BASE: Record<string, number> = { slow: 4.2, normal: 4.8, fast: 5.4 };
const GHOST_COLORS = ["#ff5f6d", "#22d3ee", "#ff7ab8", "#ffa94d"];
const CORNERS: Vec[] = [
  { x: 1, y: 1 },
  { x: 17, y: 1 },
  { x: 17, y: 19 },
  { x: 1, y: 19 },
];

/**
 * '#' wall · '.' dot · 'o' power pellet · ' ' empty · 'P' player spawn
 * 'H' ghost house · tunnel row wraps left/right. Horizontally symmetric.
 */
const BASE_MAZE: string[] = [
  "###################",
  "#........#........#",
  "#o##.###.#.###.##o#",
  "#.................#",
  "#.##.#.#####.#.##.#",
  "#....#...#...#....#",
  "####.###.#.###.####",
  "#..#.#..HHH..#.#..#",
  "#........#........#",
  "###.##.#####.##.###",
  "----.....P.....----",
  "###.##.#####.##.###",
  "#........#........#",
  "#..#.#..HHH..#.#..#",
  "####.###.#.###.####",
  "#....#...#...#....#",
  "#.##.#.#####.#.##.#",
  "#.................#",
  "#o##.###.#.###.##o#",
  "#........#........#",
  "###################",
];

/* ------------------------------------------------------------------ types */

interface Vec {
  x: number;
  y: number;
}

interface Ent {
  cx: number;
  cy: number;
  nx: number;
  ny: number;
  p: number;
  dir: Dir;
  moving: boolean;
}

interface PlayerEnt extends Ent {
  want: Dir | null;
}

type GhostState = "house" | "out" | "eaten";

interface Ghost extends Ent {
  id: number;
  color: string;
  state: GhostState;
  leaveAt: number;
  respawnAt: number;
  frightened: boolean;
}

interface Cfg {
  ghosts: number;
  powerTime: number;
  ghostBase: number;
  diffMult: number;
  accent: string;
  accent2: string;
}

interface SState {
  t: number;
  cfg: Cfg;
  template: string[][];
  grid: string[][];
  spawn: Vec;
  house: Vec[];
  center: Vec;
  player: PlayerEnt;
  ghosts: Ghost[];
  score: number;
  lives: number;
  level: number;
  levelMult: number;
  dotsLeft: number;
  dotsEaten: number;
  powerUntil: number;
  eatenThisPower: number;
  fruitActive: boolean;
  fruitUntil: number;
  invUntil: number;
  over: boolean;
  overFired: boolean;
  repScore: number;
  repStats: string;
  coinAt: number;
  achPower: boolean;
}

const DIRS: Record<Dir, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPP: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
const DIRLIST: Dir[] = ["up", "down", "left", "right"];
const ANG: Record<Dir, number> = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 };

/* ------------------------------------------------------------- maze utils */

const mod = (n: number): number => ((n % COLS) + COLS) % COLS;

/** 'random' maze = horizontally mirrored layout + a few carved loops. */
function buildTemplate(random: boolean): string[][] {
  let rows = BASE_MAZE;
  if (random) rows = rows.map((r) => r.split("").reverse().join(""));
  const g = rows.map((r) => r.split(""));
  if (random) {
    let opened = 0;
    let tries = 0;
    while (opened < 5 && tries < 300) {
      tries++;
      const x = 1 + Math.floor(Math.random() * (COLS - 2));
      const y = 1 + Math.floor(Math.random() * (ROWS - 2));
      if (g[y][x] !== "#") continue;
      let open = 0;
      for (const d of DIRLIST) {
        const c = g[y + DIRS[d].y]?.[x + DIRS[d].x];
        if (c !== undefined && c !== "#") open++;
      }
      if (open >= 2) {
        g[y][x] = ".";
        opened++;
      }
    }
  }
  return g;
}

function findTile(t: string[][], ch: string): Vec | null {
  for (let y = 0; y < t.length; y++)
    for (let x = 0; x < t[y].length; x++) if (t[y][x] === ch) return { x, y };
  return null;
}

function findAll(t: string[][], ch: string): Vec[] {
  const out: Vec[] = [];
  for (let y = 0; y < t.length; y++)
    for (let x = 0; x < t[y].length; x++) if (t[y][x] === ch) out.push({ x, y });
  return out;
}

function countDots(g: string[][]): number {
  let n = 0;
  for (const row of g) for (const c of row) if (c === "." || c === "o") n++;
  return n;
}

function walkable(g: string[][], x: number, y: number): boolean {
  if (y < 0 || y >= ROWS) return false;
  return g[y][mod(x)] !== "#";
}

/* --------------------------------------------------------------- movement */

function tryMove(e: Ent, d: Dir, g: string[][]): boolean {
  const v = DIRS[d];
  const ny = e.cy + v.y;
  if (ny < 0 || ny >= ROWS) return false;
  const wx = mod(e.cx + v.x);
  if (g[ny][wx] === "#") return false;
  if (Math.abs(wx - e.cx) > 1) e.cx = wx; // tunnel wrap snap
  e.nx = wx;
  e.ny = ny;
  e.dir = d;
  e.moving = true;
  return true;
}

/** Fixed-distance mover; `decide` is called whenever the entity is at a tile. */
function advance(e: Ent, dist: number, decide: () => void): void {
  let rem = dist;
  let guard = 0;
  while (rem > 1e-6 && guard++ < 10) {
    if (!e.moving) {
      decide();
      if (!e.moving) return;
    }
    const need = 1 - e.p;
    if (rem < need) {
      e.p += rem;
      return;
    }
    rem -= need;
    e.cx = e.nx;
    e.cy = e.ny;
    e.p = 0;
    e.moving = false;
    decide();
  }
}

function entPos(e: Ent): Vec {
  if (!e.moving) return { x: e.cx, y: e.cy };
  return { x: e.cx + (e.nx - e.cx) * e.p, y: e.cy + (e.ny - e.cy) * e.p };
}

/* -------------------------------------------------------------------- AI */

function ghostTarget(s: SState, g: Ghost): Vec {
  const p = s.player;
  if (g.id === 0) return { x: p.cx, y: p.cy }; // hunter: player tile
  if (g.id === 1) {
    // ambusher: 4 tiles ahead of the player
    const v = DIRS[p.dir];
    return { x: p.cx + v.x * 4, y: p.cy + v.y * 4 };
  }
  // mixed: alternates chase / scatter every 4s
  const chase = Math.floor(s.t / 4) % 2 === 0;
  return chase ? { x: p.cx, y: p.cy } : CORNERS[g.id % CORNERS.length];
}

function ghostDecide(s: SState, g: Ghost): void {
  const opts: Dir[] = [];
  for (const d of DIRLIST) {
    if (d === OPP[g.dir]) continue; // never reverse
    if (walkable(s.grid, g.cx + DIRS[d].x, g.cy + DIRS[d].y)) opts.push(d);
  }
  if (opts.length === 0) opts.push(OPP[g.dir]);
  let pick: Dir = opts[0];
  if (g.frightened) {
    let best = -Infinity;
    for (const d of opts) {
      const wx = mod(g.cx + DIRS[d].x);
      const wy = g.cy + DIRS[d].y;
      const score = -Math.hypot(wx - s.player.cx, wy - s.player.cy) + Math.random() * 0.001;
      if (score > best) {
        best = score;
        pick = d;
      }
    }
  } else if (g.id === 2) {
    // wanderer: pure random
    pick = opts[Math.floor(Math.random() * opts.length)];
  } else {
    const tgt = ghostTarget(s, g);
    let best = Infinity;
    for (const d of opts) {
      const wx = mod(g.cx + DIRS[d].x);
      const wy = g.cy + DIRS[d].y;
      const score = Math.hypot(wx - tgt.x, wy - tgt.y) + Math.random() * 0.001;
      if (score < best) {
        best = score;
        pick = d;
      }
    }
  }
  tryMove(g, pick, s.grid);
}

function playerDecide(s: SState): void {
  const pl = s.player;
  if (pl.want) {
    if (tryMove(pl, pl.want, s.grid)) {
      pl.want = null;
      return;
    }
  }
  if (!tryMove(pl, pl.dir, s.grid)) pl.moving = false;
}

/* ------------------------------------------------------------------ state */

function resetPositions(s: SState): void {
  const pl = s.player;
  pl.cx = s.spawn.x;
  pl.cy = s.spawn.y;
  pl.nx = s.spawn.x;
  pl.ny = s.spawn.y;
  pl.p = 0;
  pl.dir = "left";
  pl.moving = false;
  pl.want = null;
  s.ghosts.forEach((g, i) => {
    const h = s.house[i % s.house.length];
    g.cx = h.x;
    g.cy = h.y;
    g.nx = h.x;
    g.ny = h.y;
    g.p = 0;
    g.dir = "up";
    g.moving = false;
    g.state = "house";
    g.leaveAt = s.t + 2.5 * i;
    g.respawnAt = 0;
    g.frightened = false;
  });
  s.powerUntil = 0;
  s.eatenThisPower = 0;
  s.fruitActive = false;
  s.invUntil = s.t + 2;
}

function initState(cfg: Cfg, template: string[][]): SState {
  const grid = template.map((r) => r.slice());
  const spawn = findTile(template, "P") ?? { x: 9, y: 10 };
  const house = findAll(template, "H");
  const center = { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) };
  const ghosts: Ghost[] = [];
  for (let i = 0; i < cfg.ghosts; i++) {
    const h = house[i % Math.max(1, house.length)] ?? center;
    ghosts.push({
      id: i,
      color: GHOST_COLORS[i % GHOST_COLORS.length],
      cx: h.x,
      cy: h.y,
      nx: h.x,
      ny: h.y,
      p: 0,
      dir: "up",
      moving: false,
      state: "house",
      leaveAt: 2.5 * i,
      respawnAt: 0,
      frightened: false,
    });
  }
  return {
    t: 0,
    cfg,
    template,
    grid,
    spawn,
    house,
    center,
    player: { cx: spawn.x, cy: spawn.y, nx: spawn.x, ny: spawn.y, p: 0, dir: "left", moving: false, want: null },
    ghosts,
    score: 0,
    lives: 3,
    level: 1,
    levelMult: 1,
    dotsLeft: countDots(grid),
    dotsEaten: 0,
    powerUntil: 0,
    eatenThisPower: 0,
    fruitActive: false,
    fruitUntil: 0,
    invUntil: 0,
    over: false,
    overFired: false,
    repScore: -1,
    repStats: "",
    coinAt: -1,
    achPower: false,
  };
}

/* ----------------------------------------------------------------- update */

function sfxCoin(s: SState): void {
  if (s.t - s.coinAt > 0.07) {
    s.coinAt = s.t;
    playSfx("coin");
  }
}

function consumeDot(s: SState): void {
  s.dotsLeft--;
  s.dotsEaten++;
  if (s.dotsLeft <= 0) {
    playSfx("levelup");
    if (s.cfg.ghosts === 4) try {
      unlockAchievement("muncher_ghosts_4");
    } catch {
      /* noop */
    }
    s.level++;
    s.levelMult = Math.pow(1.08, s.level - 1);
    s.grid = s.template.map((r) => r.slice());
    s.dotsLeft = countDots(s.grid);
    s.dotsEaten = 0;
    resetPositions(s);
    return;
  }
  if (s.dotsEaten % 40 === 0) {
    s.fruitActive = true;
    s.fruitUntil = s.t + 8;
  }
}

function eatGhost(s: SState, g: Ghost): void {
  const pts = 200 * Math.pow(2, Math.min(s.eatenThisPower, 3));
  s.score += pts;
  s.eatenThisPower++;
  playSfx("hit");
  if (s.eatenThisPower >= 3 && !s.achPower) {
    s.achPower = true;
    try {
      unlockAchievement("muncher_power");
    } catch {
      /* noop */
    }
  }
  g.state = "eaten";
  g.respawnAt = s.t + 4;
  g.frightened = false;
  g.moving = false;
  g.p = 0;
  const h = s.house[g.id % s.house.length];
  g.cx = h.x;
  g.cy = h.y;
  g.nx = h.x;
  g.ny = h.y;
}

function killPlayer(s: SState, onGameOver: (sc: number) => void): void {
  playSfx("hit");
  s.lives--;
  if (s.lives <= 0) {
    s.over = true;
    if (!s.overFired) {
      s.overFired = true;
      onGameOver(s.score);
    }
    return;
  }
  resetPositions(s);
}

function update(s: SState, dt: number, onGameOver: (sc: number) => void): void {
  s.t += dt;
  if (s.over) return;

  // player
  advance(s.player, PLAYER_SPEED * dt, () => playerDecide(s));

  // munch dots at nearest tile center
  const pos = entPos(s.player);
  const tx = mod(Math.round(pos.x));
  const ty = Math.round(pos.y);
  if (ty >= 0 && ty < ROWS) {
    const c = s.grid[ty][tx];
    if (c === ".") {
      s.grid[ty][tx] = " ";
      s.score += 10;
      sfxCoin(s);
      consumeDot(s);
    } else if (c === "o") {
      s.grid[ty][tx] = " ";
      s.score += 50;
      playSfx("power");
      s.powerUntil = s.t + s.cfg.powerTime;
      s.eatenThisPower = 0;
      for (const g of s.ghosts) if (g.state === "out") g.frightened = true;
      consumeDot(s);
    }
  }
  if (s.over) return;

  // ghosts
  const speed = s.cfg.ghostBase * s.cfg.diffMult * s.levelMult;
  for (const g of s.ghosts) {
    if (g.state === "house") {
      if (s.t >= g.leaveAt) {
        g.state = "out";
        g.frightened = s.powerUntil > s.t;
        g.dir = "up";
        ghostDecide(s, g);
      }
      continue;
    }
    if (g.state === "eaten") {
      if (s.t >= g.respawnAt) {
        const h = s.house[g.id % s.house.length];
        g.cx = h.x;
        g.cy = h.y;
        g.nx = h.x;
        g.ny = h.y;
        g.p = 0;
        g.state = "out";
        g.frightened = false;
        g.dir = "up";
        ghostDecide(s, g);
      }
      continue;
    }
    advance(g, speed * (g.frightened ? 0.6 : 1) * dt, () => ghostDecide(s, g));
  }

  // power cell expiry
  if (s.powerUntil > 0 && s.t >= s.powerUntil) {
    s.powerUntil = 0;
    for (const g of s.ghosts) g.frightened = false;
  }

  // fruit
  if (s.fruitActive) {
    if (s.t >= s.fruitUntil) {
      s.fruitActive = false;
    } else if (Math.round(pos.x) === s.center.x && Math.round(pos.y) === s.center.y) {
      s.score += 100;
      sfxCoin(s);
      s.fruitActive = false;
    }
  }

  // collisions
  const pp = entPos(s.player);
  for (const g of s.ghosts) {
    if (g.state !== "out") continue;
    const gp = entPos(g);
    if (Math.hypot(gp.x - pp.x, gp.y - pp.y) > 0.7) continue;
    if (g.frightened) {
      eatGhost(s, g);
    } else if (s.t >= s.invUntil) {
      killPlayer(s, onGameOver);
      break;
    }
  }
}

/* ----------------------------------------------------------------- render */

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function buildWalls(grid: string[][], tile: number, dpr: number, color: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(tile * COLS * dpr));
  c.height = Math.max(1, Math.round(tile * ROWS * dpr));
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.25, tile * 0.09);
  ctx.shadowColor = color;
  ctx.shadowBlur = 5; // minimal glow for perf
  const inset = tile * 0.16;
  const rad = tile * 0.22;
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (grid[y][x] === "#") {
        rr(ctx, x * tile + inset, y * tile + inset, tile - inset * 2, tile - inset * 2, rad);
        ctx.stroke();
      }
  return c;
}

function drawGhost(ctx: CanvasRenderingContext2D, g: Ghost, tile: number): void {
  if (g.state === "eaten") return;
  const pos = entPos(g);
  const px = (pos.x + 0.5) * tile;
  const py = (pos.y + 0.5) * tile;
  const w = tile * 0.74;
  const h = tile * 0.8;
  const domeY = py - h * 0.05;
  const by = py + h * 0.42;
  ctx.beginPath();
  ctx.moveTo(px - w / 2, by);
  ctx.lineTo(px - w / 2, domeY);
  ctx.arc(px, domeY, w / 2, Math.PI, 0);
  ctx.lineTo(px + w / 2, by);
  const zh = tile * 0.13;
  const step = w / 6;
  for (let i = 0; i <= 6; i++) ctx.lineTo(px + w / 2 - step * i, by - (i % 2 === 1 ? zh : 0));
  ctx.closePath();
  ctx.fillStyle = g.frightened ? "#1e40af" : g.color;
  ctx.fill();
  // eyes look toward travel direction
  const v = DIRS[g.dir];
  const er = w * 0.13;
  for (const sgn of [-1, 1]) {
    const ex = px + sgn * w * 0.18 + v.x * w * 0.06;
    const ey = py - h * 0.12 + v.y * w * 0.06;
    ctx.fillStyle = g.frightened ? "#e2e8f0" : "#ffffff";
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fill();
    if (!g.frightened) {
      ctx.fillStyle = "#111826";
      ctx.beginPath();
      ctx.arc(ex + v.x * er * 0.45, ey + v.y * er * 0.45, er * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function render(ctx: CanvasRenderingContext2D, s: SState, tile: number, walls: HTMLCanvasElement | null): void {
  const W = tile * COLS;
  const H = tile * ROWS;
  ctx.fillStyle = "#0d0a1e";
  ctx.fillRect(0, 0, W, H);
  if (walls) ctx.drawImage(walls, 0, 0, W, H);

  // dots + power cells
  const ds = Math.max(2, tile * 0.16);
  ctx.fillStyle = "#cbd5e1";
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      const c = s.grid[y][x];
      if (c === ".") ctx.fillRect((x + 0.5) * tile - ds / 2, (y + 0.5) * tile - ds / 2, ds, ds);
    }
  ctx.fillStyle = s.cfg.accent;
  ctx.shadowColor = s.cfg.accent;
  ctx.shadowBlur = 7;
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (s.grid[y][x] === "o") {
        const r = tile * (0.2 + 0.06 * Math.sin(s.t * 7 + x + y));
        ctx.beginPath();
        ctx.arc((x + 0.5) * tile, (y + 0.5) * tile, Math.max(1.5, r), 0, Math.PI * 2);
        ctx.fill();
      }
  ctx.shadowBlur = 0;

  // fruit (two cherries + stem) at maze center
  if (s.fruitActive) {
    const fx = (s.center.x + 0.5) * tile;
    const fy = (s.center.y + 0.5) * tile;
    const fr = tile * 0.18;
    ctx.fillStyle = "#ff5f6d";
    ctx.beginPath();
    ctx.arc(fx - fr * 0.6, fy + fr * 0.35, fr, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx + fr * 0.65, fy + fr * 0.5, fr * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = Math.max(1, tile * 0.06);
    ctx.beginPath();
    ctx.moveTo(fx - fr * 0.5, fy + fr * 0.1);
    ctx.quadraticCurveTo(fx, fy - fr * 1.4, fx + fr * 0.7, fy);
    ctx.stroke();
  }

  // ghosts then player on top
  for (const g of s.ghosts) drawGhost(ctx, g, tile);

  const blink = s.t < s.invUntil && Math.floor(s.t * 10) % 2 === 0;
  if (!blink) {
    const p = entPos(s.player);
    const px = (p.x + 0.5) * tile;
    const py = (p.y + 0.5) * tile;
    const r = tile * 0.42;
    const mouth = (0.1 + 0.11 * Math.abs(Math.sin(s.t * 11))) * Math.PI;
    const a = ANG[s.player.dir];
    ctx.fillStyle = s.cfg.accent;
    ctx.shadowColor = s.cfg.accent;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, r, a + mouth, a - mouth + Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // eye
    ctx.fillStyle = "#111826";
    ctx.beginPath();
    ctx.arc(px + Math.cos(a) * r * 0.15 - Math.sin(a) * r * 0.22, py + Math.sin(a) * r * 0.15 + Math.cos(a) * r * 0.22, Math.max(1, tile * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }
}

/* -------------------------------------------------------------- component */

export default function PacGame(props: GameProps) {
  const { game, settings, difficulty } = props;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const S = useRef<SState | null>(null);
  const wallsRef = useRef<HTMLCanvasElement | null>(null);
  const dimsRef = useRef<{ tile: number; dpr: number }>({ tile: 0, dpr: 1 });
  const pausedRef = useRef(props.paused);
  const cbsRef = useRef(props);
  useEffect(() => {
    pausedRef.current = props.paused;
    cbsRef.current = props;
  });
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const ach = (id: string): void => {
    try {
      unlockAchievement(id);
    } catch {
      /* noop */
    }
  };

  const setDir = useCallback((d: Dir) => {
    const s = S.current;
    if (s && !s.over) s.player.want = d;
  }, []);

  const onDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    touchRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const st = touchRef.current;
    touchRef.current = null;
    const s = S.current;
    if (!st || !s || s.over) return;
    const dx = e.clientX - st.x;
    const dy = e.clientY - st.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    s.player.want =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
  }, []);

  useEffect(() => {
    ach("muncher_first");

    const num = (k: string, def: number): number => {
      const v = parseInt(String(settings[k] ?? ""), 10);
      return Number.isFinite(v) ? v : def;
    };
    const ghosts = Math.min(4, Math.max(2, num("ghosts", 4)));
    const powerTime = Math.max(2, parseFloat(String(settings.powerTime ?? "6")) || 6);
    const speedKey = String(settings.ghostSpeed ?? "normal");
    const cfg: Cfg = {
      ghosts,
      powerTime,
      ghostBase: GHOST_BASE[speedKey] ?? 4.8,
      diffMult: difficulty === "easy" ? 0.9 : difficulty === "insane" ? 1.15 : 1.0,
      accent: game?.accent ?? "#fbbf24",
      accent2: game?.accent2 ?? "#c084fc",
    };
    S.current = initState(cfg, buildTemplate(String(settings.maze ?? "classic") === "random"));

    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const measure = (): void => {
      const s = S.current;
      if (!s) return;
      const rect = wrap.getBoundingClientRect();
      const tile = Math.max(8, Math.floor(Math.min(rect.width / COLS, rect.height / ROWS)));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.style.width = `${tile * COLS}px`;
      canvas.style.height = `${tile * ROWS}px`;
      canvas.width = Math.round(tile * COLS * dpr);
      canvas.height = Math.round(tile * ROWS * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dimsRef.current = { tile, dpr };
      wallsRef.current = buildWalls(s.grid, tile, dpr, cfg.accent2);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);

    const keyMap: Record<string, Dir> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      a: "left",
      s: "down",
      d: "right",
      W: "up",
      A: "left",
      S: "down",
      D: "right",
    };
    const onKey = (ev: KeyboardEvent): void => {
      const d = keyMap[ev.key];
      if (!d) return;
      ev.preventDefault();
      const s = S.current;
      if (s && !s.over) s.player.want = d;
    };
    window.addEventListener("keydown", onKey);

    const STEP = 1 / 120;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const frame = (now: number): void => {
      raf = requestAnimationFrame(frame);
      const s = S.current;
      if (!s) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!pausedRef.current) {
        acc += dt;
        while (acc >= STEP) {
          update(s, STEP, cbsRef.current.onGameOver);
          acc -= STEP;
        }
        if (s.score !== s.repScore) {
          s.repScore = s.score;
          cbsRef.current.onScore(s.score);
        }
        const stats = `LV ${s.level} · ● ${s.dotsLeft} · LIVES ${s.lives}`;
        if (stats !== s.repStats) {
          s.repStats = stats;
          cbsRef.current.onHudStats(stats);
        }
      }
      const ctx = canvas.getContext("2d");
      const { tile } = dimsRef.current;
      if (ctx && tile > 0) render(ctx, s, tile, wallsRef.current);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden">
      <div ref={wrapRef} className="relative flex min-h-0 w-full flex-1 items-center justify-center">
        <canvas
          ref={canvasRef}
          className="touch-none no-touch-highlight"
          onPointerDown={onDown}
          onPointerUp={onUp}
        />
      </div>
      <DPad onDir={setDir} />
    </div>
  );
}
