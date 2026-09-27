"use client";

/**
 * BLOCKFALL — orbital freight yard tetromino stacking. ARKIN-IV cartridge (Task 3-c).
 *
 * Owns: canvas rendering, fixed-timestep loop, keyboard input with DAS,
 * touch controls (D-Pad + action buttons + canvas swipes), 7-bag randomizer,
 * ghost piece, basic wall kicks, lock delay, scoring, line-clear flash and
 * NEXT preview. The shell owns pause overlay, HUD chrome and high scores.
 */

import { useCallback, useEffect, useRef } from "react";
import type { GameProps } from "./shared/types";
import { DPad, TouchActionButtons, type Dir } from "@/components/console/DPad";
import { playSfx } from "@/lib/audio/chiptune";
import { unlockAchievement } from "@/lib/storage/achievements";

/* ------------------------------ constants ------------------------------ */

const COLS = 10;
const ROWS = 20;
const DAS_DELAY_MS = 170; // hold-to-repeat delay
const DAS_REPEAT_MS = 40; // auto-repeat rate
const SOFT_MS = 45; // soft-drop interval floor
const LOCK_DELAY_MS = 400; // grounded grace before locking
const MAX_LOCK_RESETS = 8; // lock-delay resets per piece
const CLEAR_FLASH_MS = 150; // white flash before rows vanish
const TICK_MS = 16; // fixed simulation timestep
const SWIPE_STEP_PX = 24; // touch drag distance per action
const PANEL_W = 132; // side panel width (desktop layout)
const WIDE_MIN = 620; // min viewport width for side-panel layout
const KICKS = [0, -1, 1, -2, 2] as const;
const SCORE_TABLE = [0, 100, 300, 500, 800];

const FONT_PIXEL = '"Press Start 2P", monospace';
const FONT_TERM = '"VT323", monospace';
const DIM_TEXT = "rgba(148,163,184,0.9)";

/* ------------------------------ pieces ------------------------------ */

type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

interface ShapeDef {
  size: number;
  cells: [number, number][];
}

const BASE_SHAPES: Record<PieceType, ShapeDef> = {
  I: { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  T: { size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};

/** All 4 rotation states per piece, generated clockwise from the spawn state. */
const ROTATIONS: Record<PieceType, [number, number][][]> = (() => {
  const out = {} as Record<PieceType, [number, number][][]>;
  (Object.keys(BASE_SHAPES) as PieceType[]).forEach((t) => {
    const { size, cells } = BASE_SHAPES[t];
    const rots: [number, number][][] = [];
    let cur = cells.map(([x, y]) => [x, y] as [number, number]);
    for (let r = 0; r < 4; r++) {
      rots.push(cur);
      cur = cur.map(([x, y]) => [size - 1 - y, x] as [number, number]);
    }
    out[t] = rots;
  });
  return out;
})();

const PIECE_COLORS: Record<PieceType, string> = {
  I: "#22d3ee", // accent cyan
  O: "#facc15",
  T: "#b026ff", // accent2 purple
  S: "#4ade80",
  Z: "#fb7185",
  J: "#3b82f6",
  L: "#fb923c",
};

const ALL_TYPES: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];

/* ------------------------------ types ------------------------------ */

interface ActivePiece {
  type: PieceType;
  rot: number;
  x: number;
  y: number;
}

interface ClearingFx {
  rows: number[];
  t: number;
}

interface Star {
  x: number; // 0..1 normalized
  y: number;
  v: number; // drift speed (norm units / s)
  r: number; // pixel size
  c: string;
}

type Cell = PieceType | null;

interface GameState {
  board: Cell[][];
  bag: PieceType[];
  piece: ActivePiece | null;
  next: PieceType;
  score: number;
  level: number;
  lines: number;
  over: boolean;
  gravTimer: number;
  lockTimer: number;
  lockResets: number;
  dasDir: number; // -1 left | 0 none | 1 right
  dasTimer: number;
  leftHeld: boolean;
  rightHeld: boolean;
  softHeld: boolean;
  clearing: ClearingFx | null;
  shake: number;
  stars: Star[];
}

interface Layout {
  mode: "wide" | "narrow";
  cell: number;
  bx: number;
  by: number;
  panelX: number;
}

interface Api {
  move: (dx: number) => void;
  rotate: (dir: number) => void;
  soft: () => void;
  hard: () => void;
}

/* ------------------------------ helpers ------------------------------ */

function makeBoard(): Cell[][] {
  const b: Cell[][] = [];
  for (let r = 0; r < ROWS; r++) b.push(new Array<Cell>(COLS).fill(null));
  return b;
}

function clampStartLevel(v: string | boolean | undefined): number {
  const n = parseInt(String(v ?? "1"), 10);
  if (Number.isNaN(n)) return 1;
  return Math.min(8, Math.max(1, n));
}

function computeLayout(w: number, h: number): Layout {
  if (w >= WIDE_MIN && (w - PANEL_W) / COLS >= 16) {
    const cell = Math.max(10, Math.floor(Math.min(h / ROWS, (w - PANEL_W) / COLS, 40)));
    const bw = cell * COLS;
    const bh = cell * ROWS;
    const bx = Math.max(6, Math.floor((w - PANEL_W - bw) / 2));
    const by = Math.max(4, Math.floor((h - bh) / 2));
    return { mode: "wide", cell, bx, by, panelX: bx + bw + 14 };
  }
  const cell = Math.max(8, Math.floor(Math.min(h / ROWS, w / COLS, 40)));
  const bw = cell * COLS;
  const bh = cell * ROWS;
  const bx = Math.floor((w - bw) / 2);
  const by = Math.max(2, Math.floor((h - bh) / 2));
  return { mode: "narrow", cell, bx, by, panelX: 0 };
}

/* ------------------------------ component ------------------------------ */

export default function TetrisGame(props: GameProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const apiRef = useRef<Api | null>(null);
  const pausedRef = useRef(props.paused);
  const accumulatorRef = useRef(0);
  const cbsRef = useRef({
    onScore: props.onScore,
    onHudStats: props.onHudStats,
    onGameOver: props.onGameOver,
  });

  // Immutable-per-run config (component is remounted per run by the shell).
  const cfgRef = useRef({
    ghost: props.settings.ghost !== false && props.settings.ghost !== "false",
    grid: props.settings.grid !== false && props.settings.grid !== "false",
    startLevel: clampStartLevel(props.settings.startLevel),
    diffMult:
      props.difficulty === "casual" ? 1.4 : props.difficulty === "brutal" ? 0.75 : 1,
    accent: props.game.accent,
    accent2: props.game.accent2,
  });

  // Keep live refs in sync every render (loop reads refs, never stale props).
  useEffect(() => {
    pausedRef.current = props.paused;
    cbsRef.current = {
      onScore: props.onScore,
      onHudStats: props.onHudStats,
      onGameOver: props.onGameOver,
    };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctxRaw = canvas?.getContext("2d") ?? null;
    if (!canvas || !wrap || !ctxRaw) return;
    // non-null alias: hoisted helper functions below can rely on this type
    const ctx: CanvasRenderingContext2D = ctxRaw;

    const cfg = cfgRef.current;
    const accent = cfg.accent;
    const accent2 = cfg.accent2;
    let overReported = false;

    /* ---------------------------- game state ---------------------------- */

    const g: GameState = {
      board: makeBoard(),
      bag: [],
      piece: null,
      next: "T",
      score: 0,
      level: cfg.startLevel,
      lines: 0,
      over: false,
      gravTimer: 0,
      lockTimer: 0,
      lockResets: 0,
      dasDir: 0,
      dasTimer: 0,
      leftHeld: false,
      rightHeld: false,
      softHeld: false,
      clearing: null,
      shake: 0,
      stars: [],
    };

    for (let i = 0; i < 42; i++) {
      g.stars.push({
        x: Math.random(),
        y: Math.random(),
        v: 0.01 + Math.random() * 0.035,
        r: 0.6 + Math.random() * 1.7,
        c: Math.random() < 0.55 ? accent : Math.random() < 0.5 ? accent2 : "#e2e8f0",
      });
    }

    /* ---------------------------- core rules ---------------------------- */

    function refillBag(): void {
      const types = [...ALL_TYPES];
      for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = types[i];
        types[i] = types[j];
        types[j] = tmp;
      }
      g.bag.push(...types);
    }

    function takeFromBag(): PieceType {
      if (g.bag.length === 0) refillBag();
      return g.bag.shift() as PieceType;
    }

    function collides(type: PieceType, rot: number, px: number, py: number): boolean {
      const cells = ROTATIONS[type][((rot % 4) + 4) % 4];
      for (let i = 0; i < cells.length; i++) {
        const x = px + cells[i][0];
        const y = py + cells[i][1];
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && g.board[y][x] !== null) return true;
      }
      return false;
    }

    function canDown(): boolean {
      const p = g.piece;
      return !!p && !collides(p.type, p.rot, p.x, p.y + 1);
    }

    function addScore(n: number): void {
      if (n <= 0) return;
      g.score += n;
      cbsRef.current.onScore(g.score);
    }

    function updateHud(): void {
      cbsRef.current.onHudStats(`LV ${g.level} · LINES ${g.lines} · NEXT ${g.next}`);
    }

    function gravityMs(): number {
      const base = Math.max(60, 800 * Math.pow(0.85, g.level - 1));
      return base * cfg.diffMult;
    }

    /** Lock-delay reset policy: reset on successful move/rotate, max 8 resets. */
    function onMovedWhileGrounded(): void {
      if (!canDown()) {
        if (g.lockResets < MAX_LOCK_RESETS) {
          g.lockTimer = 0;
          g.lockResets++;
        }
      } else {
        g.lockTimer = 0;
      }
    }

    function move(dx: number): void {
      const p = g.piece;
      if (!p || g.over || g.clearing || pausedRef.current) return;
      if (collides(p.type, p.rot, p.x + dx, p.y)) return;
      p.x += dx;
      playSfx("move");
      onMovedWhileGrounded();
    }

    function rotate(dir: number): void {
      const p = g.piece;
      if (!p || g.over || g.clearing || pausedRef.current) return;
      if (p.type === "O") {
        playSfx("rotate");
        return;
      }
      const nr = (((p.rot + dir) % 4) + 4) % 4;
      for (const k of KICKS) {
        if (!collides(p.type, nr, p.x + k, p.y)) {
          p.rot = nr;
          p.x += k;
          playSfx("rotate");
          onMovedWhileGrounded();
          return;
        }
      }
    }

    function softStep(): void {
      const p = g.piece;
      if (!p || g.over || g.clearing || pausedRef.current) return;
      if (!collides(p.type, p.rot, p.x, p.y + 1)) {
        p.y++;
        addScore(1);
        g.gravTimer = 0;
        g.lockTimer = 0;
      }
    }

    function hardDrop(): void {
      const p = g.piece;
      if (!p || g.over || g.clearing || pausedRef.current) return;
      let d = 0;
      while (!collides(p.type, p.rot, p.x, p.y + 1)) {
        p.y++;
        d++;
      }
      addScore(d * 2);
      playSfx("drop");
      g.shake = Math.min(1.2, g.shake + 0.45);
      lockPiece();
    }

    function spawn(): void {
      const type = g.next;
      g.next = takeFromBag();
      const p: ActivePiece = { type, rot: 0, x: type === "O" ? 4 : 3, y: 0 };
      g.piece = p;
      g.gravTimer = 0;
      g.lockTimer = 0;
      g.lockResets = 0;
      if (collides(type, 0, p.x, p.y)) {
        g.over = true;
        if (!overReported) {
          overReported = true;
          cbsRef.current.onGameOver(g.score);
        }
        return;
      }
      updateHud();
    }

    function lockPiece(): void {
      const p = g.piece;
      if (!p) return;
      const cells = ROTATIONS[p.type][p.rot];
      for (const [ox, oy] of cells) {
        const x = p.x + ox;
        const y = p.y + oy;
        if (x >= 0 && x < COLS && y >= 0 && y < ROWS) g.board[y][x] = p.type;
      }
      g.piece = null;
      playSfx("hit");

      const full: number[] = [];
      for (let r = 0; r < ROWS; r++) {
        let filled = true;
        for (let c = 0; c < COLS; c++) {
          if (g.board[r][c] === null) {
            filled = false;
            break;
          }
        }
        if (filled) full.push(r);
      }

      if (full.length === 0) {
        spawn();
        return;
      }

      g.clearing = { rows: full, t: 0 };
      playSfx("clearLine");
      if (full.length === 4) {
        unlockAchievement("tetris_tetris");
        g.shake = Math.min(1.2, g.shake + 0.5);
      }
      addScore(SCORE_TABLE[Math.min(4, full.length)] * g.level);
      g.lines += full.length;
      const nl = cfg.startLevel + Math.floor(g.lines / 10);
      if (nl > g.level) {
        g.level = nl;
        playSfx("levelup");
        if (g.level >= 5) unlockAchievement("tetris_level_5");
        g.shake = Math.min(1.2, g.shake + 0.3);
      }
      updateHud();
    }

    function finishClear(): void {
      if (!g.clearing) return;
      const dead = new Set(g.clearing.rows);
      const kept: Cell[][] = [];
      for (let r = 0; r < ROWS; r++) {
        if (!dead.has(r)) kept.push(g.board[r]);
      }
      // Row 0 is the TOP of the board: cleared rows collapse downward,
      // so the empty replacement rows must be inserted at the TOP.
      while (kept.length < ROWS) kept.unshift(new Array<Cell>(COLS).fill(null));
      g.board = kept;
      g.clearing = null;
      spawn();
    }

    /* ---------------------------- simulation ---------------------------- */

    function update(dt: number): void {
      if (g.over) return;

      for (const s of g.stars) {
        s.y += s.v * (dt / 1000);
        if (s.y > 1.02) {
          s.y = -0.02;
          s.x = Math.random();
        }
      }

      if (g.clearing) {
        g.clearing.t += dt;
        if (g.clearing.t >= CLEAR_FLASH_MS) finishClear();
        return;
      }

      const p = g.piece;
      if (!p) return;

      // DAS: charged hold → first repeat after 170ms, then every 40ms.
      if (g.dasDir !== 0) {
        g.dasTimer += dt;
        let guard = 0;
        while (g.dasTimer >= DAS_DELAY_MS && guard < 8) {
          g.dasTimer -= DAS_REPEAT_MS;
          move(g.dasDir);
          guard++;
        }
      }

      // Gravity / soft drop.
      const interval = g.softHeld ? Math.min(SOFT_MS, gravityMs()) : gravityMs();
      g.gravTimer += dt;
      let guard2 = 0;
      while (g.gravTimer >= interval && guard2 < 16) {
        g.gravTimer -= interval;
        guard2++;
        if (!collides(p.type, p.rot, p.x, p.y + 1)) {
          p.y++;
          if (g.softHeld) addScore(1);
          g.lockTimer = 0;
        } else {
          g.gravTimer = 0;
          break;
        }
      }

      // Lock delay.
      if (collides(p.type, p.rot, p.x, p.y + 1)) {
        g.lockTimer += dt;
        if (g.lockTimer >= LOCK_DELAY_MS) {
          lockPiece();
          return;
        }
      } else {
        g.lockTimer = 0;
      }

      g.shake = Math.max(0, g.shake - dt / 160);
    }

    /* ---------------------------- rendering ---------------------------- */

    function drawBlock(
      cx: CanvasRenderingContext2D,
      x: number,
      y: number,
      s: number,
      color: string,
      glow: boolean
    ): void {
      const pad = Math.max(1, s * 0.07);
      const b = Math.max(1.5, s * 0.14);
      const w = s - pad * 2;
      if (w <= 1) return;
      if (glow) {
        cx.save();
        cx.shadowColor = color;
        cx.shadowBlur = Math.max(6, s * 0.55);
        cx.fillStyle = color;
        cx.fillRect(x + pad, y + pad, w, w);
        cx.restore();
      }
      cx.fillStyle = color;
      cx.fillRect(x + pad, y + pad, w, w);
      // inner bevel: light top-left
      cx.fillStyle = "rgba(255,255,255,0.42)";
      cx.fillRect(x + pad, y + pad, w, b);
      cx.fillRect(x + pad, y + pad, b, w);
      // inner bevel: dark bottom-right
      cx.fillStyle = "rgba(0,0,0,0.42)";
      cx.fillRect(x + pad, y + s - pad - b, w, b);
      cx.fillRect(x + s - pad - b, y + pad, b, w);
      // core shine
      cx.fillStyle = "rgba(255,255,255,0.16)";
      const core = Math.max(1.5, s * 0.18);
      cx.fillRect(x + s * 0.34, y + s * 0.34, core, core);
    }

    function drawGhostCell(
      cx: CanvasRenderingContext2D,
      x: number,
      y: number,
      s: number,
      color: string
    ): void {
      const inset = Math.max(1.5, s * 0.1);
      cx.save();
      cx.globalAlpha = 0.1;
      cx.fillStyle = color;
      cx.fillRect(x + inset, y + inset, s - inset * 2, s - inset * 2);
      cx.globalAlpha = 0.55;
      cx.strokeStyle = color;
      cx.lineWidth = Math.max(1.2, s * 0.07);
      cx.strokeRect(x + inset, y + inset, s - inset * 2, s - inset * 2);
      cx.restore();
    }

    function drawMini(
      cx: CanvasRenderingContext2D,
      type: PieceType,
      centerX: number,
      centerY: number,
      s: number
    ): void {
      const cells = ROTATIONS[type][0];
      let minX = 9;
      let maxX = -9;
      let minY = 9;
      let maxY = -9;
      for (const [x, y] of cells) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      const ox = centerX - ((maxX - minX + 1) * s) / 2 - minX * s;
      const oy = centerY - ((maxY - minY + 1) * s) / 2 - minY * s;
      for (const [x, y] of cells) {
        drawBlock(cx, ox + x * s, oy + y * s, s, PIECE_COLORS[type], true);
      }
    }

    function drawBoardFrame(cx: CanvasRenderingContext2D, L: Layout): void {
      const bw = L.cell * COLS;
      const bh = L.cell * ROWS;
      cx.fillStyle = "rgba(2,6,14,0.82)";
      cx.fillRect(L.bx, L.by, bw, bh);

      if (cfg.grid) {
        cx.save();
        cx.strokeStyle = accent;
        cx.globalAlpha = 0.12;
        cx.lineWidth = 1;
        cx.beginPath();
        for (let c = 1; c < COLS; c++) {
          const x = L.bx + c * L.cell + 0.5;
          cx.moveTo(x, L.by);
          cx.lineTo(x, L.by + bh);
        }
        for (let r = 1; r < ROWS; r++) {
          const y = L.by + r * L.cell + 0.5;
          cx.moveTo(L.bx, y);
          cx.lineTo(L.bx + bw, y);
        }
        cx.stroke();
        cx.restore();
      }

      cx.save();
      cx.shadowColor = accent;
      cx.shadowBlur = 16;
      cx.strokeStyle = accent;
      cx.lineWidth = 2;
      cx.strokeRect(L.bx - 3.5, L.by - 3.5, bw + 7, bh + 7);
      cx.restore();
    }

    function drawPanel(cx: CanvasRenderingContext2D, L: Layout): void {
      const px = L.panelX;
      const y0 = L.by;
      cx.textBaseline = "top";

      cx.font = `9px ${FONT_PIXEL}`;
      cx.fillStyle = accent;
      cx.shadowColor = accent;
      cx.shadowBlur = 8;
      cx.fillText("NEXT", px, y0 + 2);
      cx.shadowBlur = 0;

      const pv = Math.max(7, Math.floor(L.cell * 0.52));
      const boxW = pv * 5;
      const boxH = Math.round(pv * 4.4);
      const bx0 = px + 2;
      const by0 = y0 + 18;
      cx.fillStyle = "rgba(2,6,14,0.8)";
      cx.fillRect(bx0, by0, boxW, boxH);
      cx.strokeStyle = accent2;
      cx.lineWidth = 1.5;
      cx.strokeRect(bx0 + 0.5, by0 + 0.5, boxW - 1, boxH - 1);
      drawMini(cx, g.next, bx0 + boxW / 2, by0 + boxH / 2, pv);

      let sy = by0 + boxH + 18;
      cx.font = `8px ${FONT_PIXEL}`;
      cx.fillStyle = DIM_TEXT;
      cx.fillText("LEVEL", px, sy);
      cx.font = `22px ${FONT_TERM}`;
      cx.fillStyle = accent;
      cx.shadowColor = accent;
      cx.shadowBlur = 8;
      cx.fillText(String(g.level), px, sy + 11);
      cx.shadowBlur = 0;

      sy += 46;
      cx.font = `8px ${FONT_PIXEL}`;
      cx.fillStyle = DIM_TEXT;
      cx.fillText("LINES", px, sy);
      cx.font = `22px ${FONT_TERM}`;
      cx.fillStyle = accent2;
      cx.shadowColor = accent2;
      cx.shadowBlur = 8;
      cx.fillText(String(g.lines), px, sy + 11);
      cx.shadowBlur = 0;
    }

    function drawCornerNext(cx: CanvasRenderingContext2D, L: Layout, w: number): void {
      const pv = Math.max(6, Math.floor(L.cell * 0.4));
      const boxW = Math.round(pv * 4.6);
      const boxH = Math.round(pv * 4);
      const x1 = w - 6;
      const x0 = x1 - boxW;
      const y0 = 6;
      cx.textBaseline = "top";

      cx.fillStyle = "rgba(2,6,14,0.72)";
      cx.fillRect(x0, y0, boxW, boxH);
      cx.strokeStyle = accent2;
      cx.lineWidth = 1;
      cx.strokeRect(x0 + 0.5, y0 + 0.5, boxW - 1, boxH - 1);

      cx.font = `7px ${FONT_PIXEL}`;
      cx.fillStyle = DIM_TEXT;
      cx.textAlign = "right";
      cx.fillText("NEXT", x1 - 3, y0 + 2);
      cx.textAlign = "left";
      drawMini(cx, g.next, x0 + boxW / 2, y0 + boxH * 0.64, pv);

      // compact readout top-left (shell HUD stats are hidden on small screens)
      const labelY = Math.max(6, L.by - 14);
      cx.font = `7px ${FONT_PIXEL}`;
      cx.fillStyle = "rgba(226,232,240,0.75)";
      cx.fillText(`LV${g.level}·${g.lines}L`, 6, labelY);
    }

    function render(): void {
      const { w, h, dpr } = sizeRef.current;
      if (w < 10 || h < 10) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const L = computeLayout(w, h);

      // drifting yard debris (background)
      for (const s of g.stars) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = s.c;
        ctx.fillRect(Math.floor(s.x * w), Math.floor(s.y * h), s.r, s.r);
      }
      ctx.globalAlpha = 1;

      // hard-drop / tetris screen shake
      const shake = pausedRef.current ? 0 : g.shake;
      const shx = shake > 0 ? (Math.random() * 2 - 1) * shake * 3 : 0;
      const shy = shake > 0 ? (Math.random() * 2 - 1) * shake * 3 : 0;
      ctx.save();
      ctx.translate(shx, shy);

      drawBoardFrame(ctx, L);
      const cell = L.cell;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = g.board[r][c];
          if (t) {
            drawBlock(ctx, L.bx + c * cell, L.by + r * cell, cell, PIECE_COLORS[t], false);
          }
        }
      }

      // line-clear white flash
      if (g.clearing) {
        const prog = Math.min(1, g.clearing.t / CLEAR_FLASH_MS);
        const a = (1 - prog) * (0.55 + 0.45 * Math.abs(Math.sin(g.clearing.t / 18)));
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        for (const r of g.clearing.rows) {
          ctx.fillRect(L.bx, L.by + r * cell, cell * COLS, cell);
        }
      }

      const p = g.piece;
      if (p) {
        if (cfg.ghost && !g.over) {
          let gy = p.y;
          while (!collides(p.type, p.rot, p.x, gy + 1)) gy++;
          if (gy > p.y) {
            const cells = ROTATIONS[p.type][p.rot];
            for (const [ox, oy] of cells) {
              const yy = gy + oy;
              if (yy < 0) continue;
              drawGhostCell(
                ctx,
                L.bx + (p.x + ox) * cell,
                L.by + yy * cell,
                cell,
                PIECE_COLORS[p.type]
              );
            }
          }
        }
        const cells = ROTATIONS[p.type][p.rot];
        for (const [ox, oy] of cells) {
          const yy = p.y + oy;
          if (yy < 0) continue;
          drawBlock(
            ctx,
            L.bx + (p.x + ox) * cell,
            L.by + yy * cell,
            cell,
            PIECE_COLORS[p.type],
            true
          );
        }
      }

      if (L.mode === "wide") drawPanel(ctx, L);
      else drawCornerNext(ctx, L, w);

      ctx.restore();
    }

    /* ---------------------------- sizing ---------------------------- */

    const applySize = (): void => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w <= 0 || h <= 0) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      sizeRef.current = { w, h, dpr };
    };
    applySize();
    const ro = new ResizeObserver(() => applySize());
    ro.observe(wrap);

    /* ---------------------------- keyboard ---------------------------- */

    const isGameKey = (k: string): boolean =>
      [
        "ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ",
        "a", "A", "d", "D", "s", "S", "w", "W", "x", "X", "z", "Z",
      ].includes(k);

    const onKeyDown = (e: KeyboardEvent): void => {
      if (isGameKey(e.key)) e.preventDefault();
      if (pausedRef.current || g.over) return;
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          if (!e.repeat && !g.leftHeld) {
            g.leftHeld = true;
            g.dasDir = -1;
            g.dasTimer = 0;
            move(-1);
          }
          break;
        case "ArrowRight":
        case "d":
        case "D":
          if (!e.repeat && !g.rightHeld) {
            g.rightHeld = true;
            g.dasDir = 1;
            g.dasTimer = 0;
            move(1);
          }
          break;
        case "ArrowDown":
        case "s":
        case "S":
          if (!e.repeat && !g.softHeld) {
            g.softHeld = true;
            g.gravTimer = 0;
            softStep();
          }
          break;
        case "ArrowUp":
        case "w":
        case "W":
        case "x":
        case "X":
          if (!e.repeat) rotate(1);
          break;
        case "z":
        case "Z":
          if (!e.repeat) rotate(-1);
          break;
        case " ":
          if (!e.repeat) hardDrop();
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent): void => {
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          g.leftHeld = false;
          if (g.dasDir === -1) {
            g.dasDir = g.rightHeld ? 1 : 0;
            g.dasTimer = 0;
          }
          break;
        case "ArrowRight":
        case "d":
        case "D":
          g.rightHeld = false;
          if (g.dasDir === 1) {
            g.dasDir = g.leftHeld ? -1 : 0;
            g.dasTimer = 0;
          }
          break;
        case "ArrowDown":
        case "s":
        case "S":
          g.softHeld = false;
          break;
      }
    };

    const onBlur = (): void => {
      g.leftHeld = false;
      g.rightHeld = false;
      g.softHeld = false;
      g.dasDir = 0;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    /* ---------------------------- touch gestures ---------------------------- */

    let tStart: { x: number; y: number; t: number } | null = null;
    let tLast: { x: number; y: number } | null = null;

    const onTouchStart = (e: TouchEvent): void => {
      const t0 = e.changedTouches[0];
      if (!t0) return;
      tStart = { x: t0.clientX, y: t0.clientY, t: performance.now() };
      tLast = { x: t0.clientX, y: t0.clientY };
    };

    const onTouchMove = (e: TouchEvent): void => {
      const t0 = e.changedTouches[0];
      if (!t0 || !tStart || !tLast) return;
      e.preventDefault();
      let dx = t0.clientX - tLast.x;
      let dy = t0.clientY - tLast.y;
      let guard = 0;
      while (dx >= SWIPE_STEP_PX && guard < 4) {
        move(1);
        tLast.x += SWIPE_STEP_PX;
        dx -= SWIPE_STEP_PX;
        guard++;
      }
      while (dx <= -SWIPE_STEP_PX && guard < 8) {
        move(-1);
        tLast.x -= SWIPE_STEP_PX;
        dx += SWIPE_STEP_PX;
        guard++;
      }
      while (dy >= SWIPE_STEP_PX && guard < 12) {
        softStep(); // swipe / drag down = soft drop
        tLast.y += SWIPE_STEP_PX;
        dy -= SWIPE_STEP_PX;
        guard++;
      }
    };

    const onTouchEnd = (e: TouchEvent): void => {
      const t0 = e.changedTouches[0];
      if (!t0 || !tStart) return;
      const dt = performance.now() - tStart.t;
      const dy = t0.clientY - tStart.y;
      const dx = t0.clientX - tStart.x;
      if (dt < 280 && dy < -48 && Math.abs(dx) < 70) rotate(1); // quick swipe up
      tStart = null;
      tLast = null;
    };

    wrap.addEventListener("touchstart", onTouchStart, { passive: true });
    wrap.addEventListener("touchmove", onTouchMove, { passive: false });
    wrap.addEventListener("touchend", onTouchEnd, { passive: true });
    wrap.addEventListener("touchcancel", onTouchEnd, { passive: true });

    /* ---------------------------- init run ---------------------------- */

    g.next = takeFromBag();
    spawn();
    cbsRef.current.onScore(0);
    updateHud();
    unlockAchievement("tetris_first");

    apiRef.current = { move, rotate, soft: softStep, hard: hardDrop };

    /* ---------------------------- main loop ---------------------------- */

    let raf = 0;
    let last = performance.now();
    const loop = (now: number): void => {
      raf = window.requestAnimationFrame(loop);
      let dt = now - last;
      last = now;
      if (dt > 200) dt = 200;
      if (!pausedRef.current) {
        accumulatorRef.current += dt;
        let guard = 0;
        while (accumulatorRef.current >= TICK_MS && guard < 16) {
          update(TICK_MS);
          accumulatorRef.current -= TICK_MS;
          guard++;
        }
      }
      render();
    };
    raf = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      wrap.removeEventListener("touchstart", onTouchStart);
      wrap.removeEventListener("touchmove", onTouchMove);
      wrap.removeEventListener("touchend", onTouchEnd);
      wrap.removeEventListener("touchcancel", onTouchEnd);
      apiRef.current = null;
    };
  }, []);

  /* ---------------------------- touch actions ---------------------------- */

  const onDpad = useCallback((d: Dir): void => {
    const api = apiRef.current;
    if (!api) return;
    if (d === "left") api.move(-1);
    else if (d === "right") api.move(1);
    else if (d === "down") api.soft();
    else api.rotate(1);
  }, []);

  const touchActions = [
    { label: "⟲", onPress: () => apiRef.current?.rotate(-1) },
    { label: "◀", onPress: () => apiRef.current?.move(-1) },
    { label: "▶", onPress: () => apiRef.current?.move(1) },
    { label: "▼", onPress: () => apiRef.current?.soft() },
    { label: "⤓", onPress: () => apiRef.current?.hard() },
  ];

  return (
    <div className="w-full h-full flex flex-col min-h-0 select-none no-touch-highlight">
      <div
        ref={wrapRef}
        className="relative flex-1 min-h-0"
        style={{ touchAction: "none" }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas ref={canvasRef} className="absolute inset-0 block" />
      </div>
      {/* touch-only control deck (hidden on pointer:fine via CSS) */}
      <div className="shrink-0 w-full flex items-end justify-center gap-7 sm:gap-16">
        <DPad onDir={onDpad} />
        <TouchActionButtons actions={touchActions} />
      </div>
    </div>
  );
}
