"use client";

/**
 * ARKIN-IV Cartridge: SERPENT.EXE — neon grid snake.
 *
 * Task 3-a. Implements the GameProps contract:
 *  - Canvas 2D rendering (letterboxed square grid, DPR-aware, ResizeObserver)
 *  - Fixed timestep loop (requestAnimationFrame + accumulator, all in refs)
 *  - Keyboard (Arrows/WASD, preventDefault, passive:false) + swipe + D-Pad
 *  - Settings: speed / board size / walls (solid|wrap) / golden apples
 *  - Difficulty: rookie (*1.15 tick), arcade (*1.0), nightmare (*0.85 + obstacles)
 *  - Achievements: snake_first, snake_apples_10, snake_apples_25, snake_nightmare
 *  - Sounds: only playSfx("eat" | "coin" | "hit") — "die" is played by the shell
 */

import { useCallback, useEffect, useRef } from "react";
import type { GameProps } from "./shared/types";
import { playSfx } from "@/lib/audio/chiptune";
import { unlockAchievement } from "@/lib/storage/achievements";
import { DPad } from "@/components/console/DPad";
import type { Dir } from "@/components/console/DPad";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Vec {
  x: number;
  y: number;
}

type WallMode = "solid" | "wrap";

interface GoldenApple {
  x: number;
  y: number;
  msLeft: number;
}

interface SnakeState {
  grid: number;
  cx: number; // spawn center column (protected zone for nightmare obstacles)
  cy: number; // spawn center row
  tickMs: number;
  walls: WallMode;
  goldenEnabled: boolean;
  nightmare: boolean;
  segments: Vec[]; // [0] = head
  prevSegments: Vec[]; // positions before the last tick (for interpolation)
  dir: Dir;
  dirQueue: Dir[];
  apple: Vec;
  golden: GoldenApple | null;
  obstacles: Vec[];
  score: number;
  apples: number;
  acc: number; // fixed-timestep accumulator (ms)
  over: boolean;
  award10: boolean;
  award25: boolean;
  awardNm: boolean;
  lastScore: number; // last value reported via onScore
  lastHud: string; // last value reported via onHudStats
}

interface CanvasSize {
  w: number;
  h: number;
  dpr: number;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const APPLE_POINTS = 10;
const GOLDEN_POINTS = 30;
const GOLDEN_MS = 6000;
const MAX_OBSTACLES = 8;
const NIGHTMARE_SCORE = 150;
const SWIPE_MIN_PX = 24;
const MAX_STEPS_PER_FRAME = 8;

const SPEED_TICK: Record<string, number | undefined> = {
  slow: 180,
  normal: 130,
  fast: 90,
  insane: 60,
};

const BOARD_GRID: Record<string, number | undefined> = {
  small: 15,
  normal: 21,
  large: 27,
};

const DIRV: Record<Dir, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPP: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const KEY_DIRS: { [key: string]: Dir | undefined } = {
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

/* ------------------------------------------------------------------ */
/* Small drawing helpers                                               */
/* ------------------------------------------------------------------ */

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h =
      h.charAt(0) +
      h.charAt(0) +
      h.charAt(1) +
      h.charAt(1) +
      h.charAt(2) +
      h.charAt(2);
  }
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, alpha: number): string {
  const c = hexToRgb(hex);
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/* ------------------------------------------------------------------ */
/* Game logic (pure-ish, operates on the mutable state ref)            */
/* ------------------------------------------------------------------ */

function createSnakeState(
  grid: number,
  tickMs: number,
  walls: WallMode,
  goldenEnabled: boolean,
  nightmare: boolean
): SnakeState {
  const cx = Math.floor(grid / 2);
  const cy = Math.floor(grid / 2);
  const segments: Vec[] = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  const g: SnakeState = {
    grid,
    cx,
    cy,
    tickMs,
    walls,
    goldenEnabled,
    nightmare,
    segments,
    prevSegments: segments.map((s) => ({ x: s.x, y: s.y })),
    dir: "right",
    dirQueue: [],
    apple: { x: cx, y: 0 },
    golden: null,
    obstacles: [],
    score: 0,
    apples: 0,
    acc: 0,
    over: false,
    award10: false,
    award25: false,
    awardNm: false,
    lastScore: -1,
    lastHud: "",
  };
  const cell = randomFreeCell(g);
  if (cell) g.apple = cell;
  return g;
}

/** Picks a uniformly random cell not occupied by snake/obstacles/apple/golden. */
function randomFreeCell(g: SnakeState): Vec | null {
  const occ = new Set<number>();
  for (const s of g.segments) occ.add(s.y * g.grid + s.x);
  for (const o of g.obstacles) occ.add(o.y * g.grid + o.x);
  occ.add(g.apple.y * g.grid + g.apple.x);
  if (g.golden) occ.add(g.golden.y * g.grid + g.golden.x);
  const free: number[] = [];
  const total = g.grid * g.grid;
  for (let i = 0; i < total; i++) if (!occ.has(i)) free.push(i);
  if (free.length === 0) return null;
  const pick = free[Math.floor(Math.random() * free.length)];
  return { x: pick % g.grid, y: Math.floor(pick / g.grid) };
}

/** Nightmare: one obstacle per apple once 5 apples are eaten (max 8). */
function spawnObstacle(g: SnakeState): void {
  if (g.obstacles.length >= MAX_OBSTACLES) return;
  const head = g.segments[0];
  const v = DIRV[g.dir];
  const avoid = new Set<number>();

  // Never block the initial spawn corridor around the board center.
  for (let y = g.cy - 1; y <= g.cy + 1; y++) {
    for (let x = g.cx - 4; x <= g.cx + 4; x++) {
      if (x >= 0 && y >= 0 && x < g.grid && y < g.grid) avoid.add(y * g.grid + x);
    }
  }
  // Keep a short runway directly ahead of the head (fairness).
  for (let d = 1; d <= 3; d++) {
    const x = head.x + v.x * d;
    const y = head.y + v.y * d;
    if (x >= 0 && y >= 0 && x < g.grid && y < g.grid) avoid.add(y * g.grid + x);
  }

  for (let attempt = 0; attempt < 80; attempt++) {
    const x = Math.floor(Math.random() * g.grid);
    const y = Math.floor(Math.random() * g.grid);
    const key = y * g.grid + x;
    if (avoid.has(key)) continue;
    if (g.segments.some((s) => s.x === x && s.y === y)) continue;
    if (g.obstacles.some((o) => o.x === x && o.y === y)) continue;
    if (g.apple.x === x && g.apple.y === y) continue;
    if (g.golden && g.golden.x === x && g.golden.y === y) continue;
    g.obstacles.push({ x, y });
    return;
  }
}

function checkAwards(g: SnakeState): void {
  if (g.apples >= 10 && !g.award10) {
    g.award10 = true;
    unlockAchievement("snake_apples_10");
  }
  if (g.apples >= 25 && !g.award25) {
    g.award25 = true;
    unlockAchievement("snake_apples_25");
  }
  if (g.nightmare && g.score >= NIGHTMARE_SCORE && !g.awardNm) {
    g.awardNm = true;
    unlockAchievement("snake_nightmare");
  }
}

function killSnake(g: SnakeState, onOver: (score: number) => void): void {
  if (g.over) return;
  g.over = true;
  playSfx("hit"); // impact feedback; the shell plays the "die" jingle
  onOver(g.score);
}

/** Run ends because the board is completely filled — a flawless run. */
function endRun(g: SnakeState, onOver: (score: number) => void): void {
  if (g.over) return;
  g.over = true;
  onOver(g.score);
}

/** One fixed-timestep simulation tick. */
function stepSnake(g: SnakeState, onOver: (score: number) => void): void {
  if (g.over) return;

  // 1. Consume the turn queue; drop illegal (180°) and redundant inputs.
  while (g.dirQueue.length > 0) {
    const d = g.dirQueue.shift();
    if (d && d !== g.dir && OPP[d] !== g.dir) {
      g.dir = d;
      break;
    }
  }

  // 2. Compute next head cell.
  const head = g.segments[0];
  const v = DIRV[g.dir];
  const nx = head.x + v.x;
  const ny = head.y + v.y;

  // 3. Walls.
  if (g.walls === "solid" && (nx < 0 || ny < 0 || nx >= g.grid || ny >= g.grid)) {
    killSnake(g, onOver);
    return;
  }
  const wx = ((nx % g.grid) + g.grid) % g.grid;
  const wy = ((ny % g.grid) + g.grid) % g.grid;

  // 4. Eating?
  const eatsApple = wx === g.apple.x && wy === g.apple.y;
  const eatsGolden = g.golden !== null && wx === g.golden.x && wy === g.golden.y;
  const grow = eatsApple || eatsGolden;

  // 5. Self collision (the tail cell vacates when not growing).
  const bodyLen = grow ? g.segments.length : g.segments.length - 1;
  for (let i = 0; i < bodyLen; i++) {
    const s = g.segments[i];
    if (s.x === wx && s.y === wy) {
      killSnake(g, onOver);
      return;
    }
  }

  // 6. Obstacle collision.
  for (const o of g.obstacles) {
    if (o.x === wx && o.y === wy) {
      killSnake(g, onOver);
      return;
    }
  }

  // 7. Move (immutable cells — old array becomes the interpolation source).
  const old = g.segments;
  const next: Vec[] = [{ x: wx, y: wy }];
  const keep = grow ? old.length : old.length - 1;
  for (let i = 0; i < keep; i++) next.push(old[i]);
  g.prevSegments = old;
  g.segments = next;

  // 8. Rewards & spawns.
  if (eatsGolden) {
    g.golden = null;
    g.score += GOLDEN_POINTS;
    playSfx("coin");
  }
  if (eatsApple) {
    g.score += APPLE_POINTS;
    g.apples += 1;
    playSfx("eat");
    const cell = randomFreeCell(g);
    if (!cell) {
      // Board completely filled — the serpent has won the grid.
      endRun(g, onOver);
      return;
    }
    g.apple = cell;
    if (g.goldenEnabled && g.apples % 5 === 0) {
      const gc = randomFreeCell(g);
      if (gc) g.golden = { x: gc.x, y: gc.y, msLeft: GOLDEN_MS };
    }
    if (g.nightmare && g.apples >= 5) spawnObstacle(g);
  }
  checkAwards(g);
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

function drawFrame(
  ctx: CanvasRenderingContext2D,
  g: SnakeState,
  size: CanvasSize,
  ts: number,
  accent: string,
  accent2: string
): void {
  const { w, h, dpr } = size;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (w <= 0 || h <= 0) return;

  // Letterboxed square board, centered.
  const cell = Math.max(3, Math.floor(Math.min(w, h) / g.grid));
  const px = cell * g.grid;
  const ox = Math.floor((w - px) / 2);
  const oy = Math.floor((h - px) / 2);

  // Dark translucent backdrop (parent supplies the neon world gradient).
  ctx.fillStyle = "rgba(3, 10, 14, 0.52)";
  ctx.fillRect(ox, oy, px, px);

  // Subtle grid lines (accent2).
  ctx.strokeStyle = rgba(accent2, 0.09);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < g.grid; i++) {
    const gx = ox + i * cell + 0.5;
    ctx.moveTo(gx, oy + 2);
    ctx.lineTo(gx, oy + px - 2);
    const gy = oy + i * cell + 0.5;
    ctx.moveTo(ox + 2, gy);
    ctx.lineTo(ox + px - 2, gy);
  }
  ctx.stroke();

  // Board border — solid frame for walls, dashed warp tunnels for wrap.
  ctx.strokeStyle = rgba(accent2, 0.55);
  ctx.lineWidth = 2;
  ctx.setLineDash(g.walls === "wrap" ? [cell * 0.7, cell * 0.45] : []);
  ctx.strokeRect(ox + 1, oy + 1, px - 2, px - 2);
  ctx.setLineDash([]);

  // Obstacles — slate blocks with diagonal warning stripes.
  for (const o of g.obstacles) {
    const x = ox + o.x * cell;
    const y = oy + o.y * cell;
    ctx.save();
    roundRectPath(ctx, x + 1.5, y + 1.5, cell - 3, cell - 3, Math.max(2, cell * 0.15));
    ctx.fillStyle = "#232f42";
    ctx.fill();
    ctx.strokeStyle = "#52607a";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.clip();
    ctx.strokeStyle = "rgba(245, 158, 11, 0.5)";
    ctx.lineWidth = Math.max(1.5, cell * 0.12);
    const phase = ((o.x * 3 + o.y * 5) % 4) * (cell / 4);
    ctx.beginPath();
    for (let d = -cell; d <= cell * 2; d += cell / 2.5) {
      const s = d + phase;
      ctx.moveTo(x + s, y - 3);
      ctx.lineTo(x + s - (cell + 6), y + cell + 3);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Apple — coral circle with glow, shine and a small leaf.
  {
    const ax = ox + (g.apple.x + 0.5) * cell;
    const ay = oy + (g.apple.y + 0.5) * cell;
    const r = cell * 0.3;
    ctx.save();
    ctx.shadowColor = "#fb7185";
    ctx.shadowBlur = cell * 0.8;
    ctx.fillStyle = "#f87171";
    ctx.beginPath();
    ctx.arc(ax, ay, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(ax - r * 0.32, ay - r * 0.36, Math.max(1, cell * 0.06), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(accent, 0.9);
    ctx.beginPath();
    ctx.ellipse(ax + r * 0.3, ay - r * 0.95, r * 0.34, r * 0.16, -0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Golden apple — pulsing gold glow, blinks (faster near expiry).
  if (g.golden) {
    const gx = ox + (g.golden.x + 0.5) * cell;
    const gy = oy + (g.golden.y + 0.5) * cell;
    const r = cell * 0.33;
    const pulse = 0.5 + 0.5 * Math.sin(ts / 110);
    const blink =
      g.golden.msLeft < 1600
        ? Math.sin(ts / 70) > -0.1
          ? 1
          : 0.25
        : 0.72 + 0.28 * Math.sin(ts / 170);
    ctx.save();
    ctx.globalAlpha = Math.max(0.2, blink);
    ctx.shadowColor = "#fde047";
    ctx.shadowBlur = cell * (0.65 + pulse * 0.85);
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(gx, gy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.45 * pulse;
    ctx.strokeStyle = "#fef9c3";
    ctx.lineWidth = Math.max(1, cell * 0.05);
    const L = r * (0.85 + pulse * 0.5);
    ctx.beginPath();
    ctx.moveTo(gx - L, gy);
    ctx.lineTo(gx + L, gy);
    ctx.moveTo(gx, gy - L);
    ctx.lineTo(gx, gy + L);
    ctx.stroke();
    ctx.restore();
  }

  // Snake — interpolated positions (snap on wrap jumps).
  const t = g.over ? 1 : Math.max(0, Math.min(1, g.acc / g.tickMs));
  const segs = g.segments;
  const prev = g.prevSegments;
  const pts: Vec[] = [];
  for (let i = 0; i < segs.length; i++) {
    const c = segs[i];
    const p =
      prev.length > 0 ? (i < prev.length ? prev[i] : prev[prev.length - 1]) : c;
    let ix: number;
    let iy: number;
    if (Math.abs(c.x - p.x) > 1 || Math.abs(c.y - p.y) > 1) {
      ix = c.x;
      iy = c.y;
    } else {
      ix = p.x + (c.x - p.x) * t;
      iy = p.y + (c.y - p.y) * t;
    }
    pts.push({ x: ox + (ix + 0.5) * cell, y: oy + (iy + 0.5) * cell });
  }

  // Body: continuous rounded stroke with neon glow (breaks at wrap jumps).
  ctx.save();
  ctx.shadowColor = accent;
  ctx.shadowBlur = Math.max(9, cell * 0.55);
  ctx.strokeStyle = accent;
  ctx.lineWidth = cell * 0.66;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) {
      ctx.moveTo(pts[i].x, pts[i].y);
      continue;
    }
    const dx = Math.abs(pts[i].x - pts[i - 1].x);
    const dy = Math.abs(pts[i].y - pts[i - 1].y);
    if (dx > cell * 1.5 || dy > cell * 1.5) ctx.moveTo(pts[i].x, pts[i].y);
    else ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();
  ctx.restore();

  // Head: brighter disc + direction-aware eyes (X-eyes on death).
  const hp = pts[0];
  if (hp) {
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = Math.max(12, cell * 0.8);
    ctx.fillStyle = mixHex(accent, "#ffffff", 0.4);
    ctx.beginPath();
    ctx.arc(hp.x, hp.y, cell * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const v = DIRV[g.dir];
    const ex = hp.x + v.x * cell * 0.15;
    const ey = hp.y + v.y * cell * 0.15;
    const perpX = -v.y;
    const perpY = v.x;
    if (g.over) {
      ctx.strokeStyle = "#03140c";
      ctx.lineWidth = Math.max(1.2, cell * 0.06);
      const r = Math.max(1.5, cell * 0.09);
      for (const s of [-1, 1]) {
        const cx0 = ex + perpX * cell * 0.17 * s;
        const cy0 = ey + perpY * cell * 0.17 * s;
        ctx.beginPath();
        ctx.moveTo(cx0 - r, cy0 - r);
        ctx.lineTo(cx0 + r, cy0 + r);
        ctx.moveTo(cx0 + r, cy0 - r);
        ctx.lineTo(cx0 - r, cy0 + r);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = "#03140c";
      const er = Math.max(1.3, cell * 0.075);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(ex + perpX * cell * 0.17 * s, ey + perpY * cell * 0.17 * s, er, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function SnakeGame(props: GameProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gRef = useRef<SnakeState | null>(null);
  const sizeRef = useRef<CanvasSize>({ w: 0, h: 0, dpr: 1 });
  const pausedRef = useRef<boolean>(props.paused);
  const propsRef = useRef<GameProps>(props);
  const overReportedRef = useRef<boolean>(false);

  /** Report game over exactly once per run (guarded by a ref). */
  const reportOver = useCallback((score: number) => {
    if (overReportedRef.current) return;
    overReportedRef.current = true;
    propsRef.current.onGameOver(score);
  }, []);

  const cbsRef = useRef({
    onScore: props.onScore,
    onHud: props.onHudStats,
    onOver: reportOver,
  });

  // Keep latest values reachable from the rAF loop without re-subscribing.
  useEffect(() => {
    pausedRef.current = props.paused;
  }, [props.paused]);

  useEffect(() => {
    propsRef.current = props;
    cbsRef.current = {
      onScore: props.onScore,
      onHud: props.onHudStats,
      onOver: reportOver,
    };
  });

  /** Direction input from keyboard / swipe / D-Pad, 180°-safe, queued. */
  const queueDir = useCallback((d: Dir) => {
    const g = gRef.current;
    if (!g || g.over) return;
    const last = g.dirQueue.length > 0 ? g.dirQueue[g.dirQueue.length - 1] : g.dir;
    if (d === last || OPP[d] === last) return;
    if (g.dirQueue.length < 3) g.dirQueue.push(d);
  }, []);

  const onDpad = useCallback(
    (d: Dir) => {
      queueDir(d);
    },
    [queueDir]
  );

  useEffect(() => {
    const p = propsRef.current;

    // ---- resolve settings & difficulty ----
    const tickBase = SPEED_TICK[String(p.settings.speed)] ?? SPEED_TICK.normal ?? 130;
    const mult =
      p.difficulty === "rookie" ? 1.15 : p.difficulty === "nightmare" ? 0.85 : 1;
    const grid = BOARD_GRID[String(p.settings.board)] ?? BOARD_GRID.normal ?? 21;
    const walls: WallMode = String(p.settings.walls) === "wrap" ? "wrap" : "solid";
    const goldenEnabled =
      p.settings.goldenApple === true || String(p.settings.goldenApple) === "true";
    const nightmare = p.difficulty === "nightmare";

    gRef.current = createSnakeState(
      grid,
      Math.max(30, Math.round(tickBase * mult)),
      walls,
      goldenEnabled,
      nightmare
    );

    // First-mount trophy (deduped internally by the trophy system).
    unlockAchievement("snake_first");

    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ---- responsive sizing (letterboxed square handled in drawFrame) ----
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      sizeRef.current = { w, h, dpr };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    window.addEventListener("resize", resize);

    // ---- keyboard (passive:false + preventDefault per contract) ----
    const onKey = (e: KeyboardEvent) => {
      const dir = KEY_DIRS[e.key];
      if (dir) {
        e.preventDefault();
        queueDir(dir);
        return;
      }
      if (e.key === " " || e.code === "Space") e.preventDefault();
    };
    window.addEventListener("keydown", onKey, { passive: false });

    // ---- touch: swipe steering directly on the canvas ----
    let tsx = 0;
    let tsy = 0;
    let tracking = false;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;
      tsx = t.clientX;
      tsy = t.clientY;
      tracking = true;
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!tracking) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - tsx;
      const dy = t.clientY - tsy;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (Math.max(adx, ady) < SWIPE_MIN_PX) return;
      queueDir(adx > ady ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
      tsx = t.clientX;
      tsy = t.clientY;
    };
    const onTouchEnd = () => {
      tracking = false;
    };
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchEnd);

    // ---- fixed-timestep loop ----
    let raf = 0;
    let last = performance.now();
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      const g = gRef.current;
      if (!g) return;
      const dt = Math.min(100, ts - last);
      last = ts;

      if (!pausedRef.current && !g.over) {
        g.acc += dt;
        if (g.golden) {
          g.golden.msLeft -= dt;
          if (g.golden.msLeft <= 0) g.golden = null; // missed → disappears
        }
        let steps = 0;
        while (g.acc >= g.tickMs && steps < MAX_STEPS_PER_FRAME) {
          g.acc -= g.tickMs;
          steps++;
          stepSnake(g, cbsRef.current.onOver);
          if (g.over) break;
        }
      }

      // Report score / HUD only on change (also fires the initial values).
      const cbs = cbsRef.current;
      if (g.score !== g.lastScore) {
        g.lastScore = g.score;
        cbs.onScore(g.score);
      }
      const hud = `LEN ${g.segments.length} · APPLES ${g.apples}`;
      if (hud !== g.lastHud) {
        g.lastHud = hud;
        cbs.onHud(hud);
      }

      drawFrame(ctx, g, sizeRef.current, ts, p.game.accent, p.game.accent2);
    };
    raf = requestAnimationFrame(loop);

    // ---- cleanup everything on unmount ----
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [queueDir]);

  return (
    <div className="w-full h-full min-h-0 flex flex-col items-center justify-center">
      <div ref={wrapRef} className="relative flex-1 min-h-0 w-full">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block w-full h-full touch-none select-none"
          aria-label="SERPENT.EXE game board"
        />
      </div>
      <DPad onDir={onDpad} />
    </div>
  );
}
