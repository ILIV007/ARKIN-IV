"use client";

/**
 * PONG-72 — "PHOTON COURT" cartridge for the ARKIN-IV retro console.
 *
 * Player paddle (LEFT, purple accent) vs machine mind (RIGHT, green accent).
 * First to N points wins the match. Ball bounce angle is influenced by where
 * it strikes the paddle (offset → up to 60°), and the ball gains 4% speed per
 * paddle hit (capped at 2.2× base). The AI predicts the ball's arrival Y with
 * error/jitter scaled by its IQ setting and the match difficulty.
 *
 * Technical notes:
 * - All simulation state lives in refs; React never re-renders per frame.
 * - Fixed-timestep rAF loop (120 Hz physics) with accumulator.
 * - The court is a virtual 1280×800 (16:10) space letterboxed into the parent
 *   element; base speeds are authored for an 800-high court and scale with it.
 * - props.paused freezes the simulation (render-only frames continue).
 */

import { useCallback, useEffect, useRef } from "react";
import type { GameProps } from "./shared/types";
import { DPad, type Dir } from "@/components/console/DPad";
import { playSfx } from "@/lib/audio/chiptune";
import { unlockAchievement } from "@/lib/storage/achievements";

/* ------------------------------------------------------------------ */
/* Virtual court + tuning constants                                    */
/* ------------------------------------------------------------------ */

const COURT_W = 1280;
const COURT_H = 800;
const WALL = 14; // neon top/bottom wall thickness (also physics bound)
const PADDLE_W = 18;
const PADDLE_H = 150;
const PADDLE_INSET = 44; // paddle distance from the side walls
const BALL_SIZE = 16;
const PLAYER_SPEED = 640; // player paddle max speed (virtual px/s)
const AI_BASE_SPEED = 515; // AI max speed before IQ/difficulty factors
const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60° — paddle-offset bounce limit
const SERVE_MAX_ANGLE = Math.PI / 7; // ~25° — random serve angle
const SPEED_PER_HIT = 1.04; // +4% ball speed per paddle hit
const SPEED_CAP_MULT = 2.2; // cap relative to base speed
const SERVE_PAUSE = 1.0; // seconds between a point and the next serve
const HIT_TOLERANCE = 26; // ball/paddle plane tolerance (anti-tunneling)
const STEP = 1 / 120; // fixed physics timestep (seconds)

/* ------------------------------------------------------------------ */
/* Settings / difficulty profiles                                      */
/* ------------------------------------------------------------------ */

type BallSpeedSetting = "slow" | "normal" | "fast";
type AiIQSetting = "dumb" | "normal" | "genius";
type DifficultySetting = "rookie" | "pro" | "legend";

interface DiffProfile {
  speedMul: number; // AI max speed multiplier
  reactMul: number; // AI reaction interval multiplier (lower = faster)
  errMul: number; // aim error multiplier (lower = sharper)
  hard: boolean; // counts for the pong_win_hard achievement
}

const DIFFICULTY: Record<DifficultySetting, DiffProfile> = {
  rookie: { speedMul: 0.85, reactMul: 1.15, errMul: 1.25, hard: false },
  pro: { speedMul: 1.0, reactMul: 1.0, errMul: 1.0, hard: true },
  legend: { speedMul: 1.15, reactMul: 0.85, errMul: 0.8, hard: true },
};

interface IQProfile {
  react: number; // reaction interval (seconds) between aim updates
  err: number; // aim error as a fraction of paddle height
  speed: number; // movement speed multiplier
}

const IQ_PROFILE: Record<AiIQSetting, IQProfile> = {
  dumb: { react: 0.3, err: 0.55, speed: 0.9 }, // laggy chase, big error
  normal: { react: 0.14, err: 0.22, speed: 0.97 }, // mild prediction
  genius: { react: 0.06, err: 0.07, speed: 1.0 }, // full prediction, tiny error
};

const BASE_BALL_SPEED: Record<BallSpeedSetting, number> = {
  slow: 260,
  normal: 340,
  fast: 430,
};

function parseTargetScore(v: string | boolean | undefined): number {
  return v === "5" || v === "11" ? Number(v) : 7;
}

function parseBallSpeed(v: string | boolean | undefined): BallSpeedSetting {
  return v === "slow" || v === "fast" ? v : "normal";
}

function parseIQ(v: string | boolean | undefined): AiIQSetting {
  return v === "dumb" || v === "genius" ? v : "normal";
}

function parseDifficulty(v: string): DifficultySetting {
  return v === "rookie" || v === "legend" ? v : "pro";
}

/* ------------------------------------------------------------------ */
/* Simulation types                                                    */
/* ------------------------------------------------------------------ */

interface Paddle {
  x: number; // left edge
  y: number; // top edge
  w: number;
  h: number;
}

interface Ball {
  x: number; // center
  y: number; // center
  vx: number;
  vy: number;
  speed: number; // current magnitude (grows per paddle hit)
  size: number;
}

interface TrailDot {
  x: number;
  y: number;
  life: number; // 1 → 0
}

interface Brain {
  iq: AiIQSetting;
  maxSpeed: number; // virtual px/s
  reactInterval: number; // seconds between aim updates
  errAmp: number; // aim error amplitude (virtual px)
  timer: number; // countdown to next aim update
  targetY: number;
}

interface World {
  player: Paddle;
  ai: Paddle;
  ball: Ball;
  trail: TrailDot[];
  playerPoints: number;
  aiPoints: number;
  rally: number;
  maxRally: number;
  serving: boolean;
  serveTimer: number;
  serveDir: number; // -1 → toward player, +1 → toward AI
  over: boolean;
  won: boolean;
  baseSpeed: number;
  flash: number;
  shake: number;
  brain: Brain;
}

function clampPaddle(p: Paddle): void {
  const min = WALL;
  const max = COURT_H - WALL - p.h;
  if (p.y < min) p.y = min;
  if (p.y > max) p.y = max;
}

function createWorld(
  settings: Record<string, string | boolean>,
  difficulty: string
): World {
  // Base speeds are authored for an 800-high court — scale with court height.
  const speedScale = COURT_H / 800;
  const base = BASE_BALL_SPEED[parseBallSpeed(settings.ballSpeed)] * speedScale;
  const iq = parseIQ(settings.aiIQ);
  const diff = DIFFICULTY[parseDifficulty(difficulty)];
  const ip = IQ_PROFILE[iq];

  return {
    player: {
      x: PADDLE_INSET,
      y: COURT_H / 2 - PADDLE_H / 2,
      w: PADDLE_W,
      h: PADDLE_H,
    },
    ai: {
      x: COURT_W - PADDLE_INSET - PADDLE_W,
      y: COURT_H / 2 - PADDLE_H / 2,
      w: PADDLE_W,
      h: PADDLE_H,
    },
    ball: {
      x: COURT_W / 2,
      y: COURT_H / 2,
      vx: 0,
      vy: 0,
      speed: base,
      size: BALL_SIZE,
    },
    trail: [],
    playerPoints: 0,
    aiPoints: 0,
    rally: 0,
    maxRally: 0,
    serving: true,
    serveTimer: SERVE_PAUSE,
    serveDir: Math.random() < 0.5 ? -1 : 1,
    over: false,
    won: false,
    baseSpeed: base,
    flash: 0,
    shake: 0,
    brain: {
      iq,
      maxSpeed: AI_BASE_SPEED * ip.speed * diff.speedMul,
      reactInterval: ip.react * diff.reactMul,
      errAmp: PADDLE_H * ip.err * diff.errMul,
      timer: 0,
      targetY: COURT_H / 2,
    },
  };
}

/** Triangle-wave reflection: straight-line Y the ball reaches at targetX. */
function predictBallY(ball: Ball, targetX: number): number {
  if (Math.abs(ball.vx) < 1e-4) return ball.y;
  const t = (targetX - ball.x) / ball.vx;
  if (t <= 0) return ball.y;
  const min = WALL + ball.size / 2;
  const max = COURT_H - WALL - ball.size / 2;
  const span = max - min;
  if (span <= 0) return COURT_H / 2;
  const raw = ball.y + ball.vy * t;
  const period = span * 2;
  let rel = (raw - min) % period;
  if (rel < 0) rel += period;
  return rel <= span ? min + rel : min + period - rel;
}

/** AI re-aims (called on its reaction timer — the lag IS the difficulty). */
function aiThink(w: World): void {
  const b = w.brain;
  let target: number;
  if (w.serving) {
    target = COURT_H / 2;
  } else if (b.iq === "dumb") {
    // Dumb: pure ball chase — lag comes from the slow reaction timer.
    target = w.ball.y;
  } else if (w.ball.vx > 0) {
    // Normal/genius: predict arrival Y with wall reflections.
    target = predictBallY(w.ball, w.ai.x - w.ball.size / 2);
  } else {
    // Ball travelling away — drift back home.
    target = COURT_H / 2;
  }
  b.targetY = target + (Math.random() * 2 - 1) * b.errAmp;
}

function aiMove(w: World, dt: number): void {
  const center = w.ai.y + w.ai.h / 2;
  const delta = w.brain.targetY - center;
  if (Math.abs(delta) <= 6) return; // dead zone — no jitter sweat
  const step = Math.min(Math.abs(delta), w.brain.maxSpeed * dt);
  w.ai.y += Math.sign(delta) * step;
  clampPaddle(w.ai);
}

function bounceOffPaddle(w: World, p: Paddle, dir: 1 | -1): void {
  const b = w.ball;
  const half = b.size / 2;
  const paddleCenter = p.y + p.h / 2;
  // Hit offset ∈ [-1, 1] → bounce angle up to ±60°.
  const offset = Math.max(
    -1,
    Math.min(1, (b.y - paddleCenter) / (p.h / 2 + half))
  );
  const angle = offset * MAX_BOUNCE_ANGLE;
  b.speed = Math.min(b.speed * SPEED_PER_HIT, w.baseSpeed * SPEED_CAP_MULT);
  b.vx = Math.cos(angle) * b.speed * dir;
  b.vy = Math.sin(angle) * b.speed;
  // Reposition on the paddle face so we can't double-collide.
  if (dir === 1) b.x = p.x + p.w + half + 1;
  else b.x = p.x - half - 1;

  w.rally += 1;
  if (w.rally > w.maxRally) w.maxRally = w.rally;
  w.shake = Math.min(6, w.shake + 2);
  playSfx("hit");
}

function scorePoint(
  w: World,
  scorer: "player" | "ai",
  targetScore: number,
  onMatchEnd: (won: boolean) => void
): void {
  if (scorer === "player") {
    w.playerPoints += 1;
    w.serveDir = 1; // AI conceded → serve toward the AI
  } else {
    w.aiPoints += 1;
    w.serveDir = -1; // player conceded → serve toward the player
  }
  if (w.rally > w.maxRally) w.maxRally = w.rally;
  w.rally = 0;
  w.flash = 1;
  w.shake = 10;
  w.serving = true;
  w.serveTimer = SERVE_PAUSE;
  w.ball.x = COURT_W / 2;
  w.ball.y = COURT_H / 2;
  w.ball.vx = 0;
  w.ball.vy = 0;
  w.ball.speed = w.baseSpeed;
  w.trail.length = 0;
  playSfx("coin");

  if (w.playerPoints >= targetScore || w.aiPoints >= targetScore) {
    w.over = true;
    w.won = w.playerPoints >= targetScore;
    onMatchEnd(w.won);
  }
}

function updateBall(
  w: World,
  dt: number,
  targetScore: number,
  onMatchEnd: (won: boolean) => void
): void {
  const b = w.ball;

  if (w.serving) {
    w.serveTimer -= dt;
    if (w.serveTimer <= 0) {
      w.serving = false;
      const angle = (Math.random() * 2 - 1) * SERVE_MAX_ANGLE;
      b.speed = w.baseSpeed;
      b.vx = Math.cos(angle) * b.speed * w.serveDir;
      b.vy = Math.sin(angle) * b.speed;
    }
    return;
  }

  const half = b.size / 2;
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  // Top / bottom wall bounce.
  if (b.y - half < WALL && b.vy < 0) {
    b.y = WALL + half;
    b.vy = -b.vy;
    playSfx("move");
  } else if (b.y + half > COURT_H - WALL && b.vy > 0) {
    b.y = COURT_H - WALL - half;
    b.vy = -b.vy;
    playSfx("move");
  }

  // Player paddle (left face, ball moving left).
  if (
    b.vx < 0 &&
    b.x - half <= w.player.x + w.player.w &&
    b.x - half >= w.player.x - HIT_TOLERANCE &&
    b.y >= w.player.y - half &&
    b.y <= w.player.y + w.player.h + half
  ) {
    bounceOffPaddle(w, w.player, 1);
  }

  // AI paddle (right face, ball moving right).
  if (
    b.vx > 0 &&
    b.x + half >= w.ai.x &&
    b.x + half <= w.ai.x + w.ai.w + HIT_TOLERANCE &&
    b.y >= w.ai.y - half &&
    b.y <= w.ai.y + w.ai.h + half
  ) {
    bounceOffPaddle(w, w.ai, -1);
  }

  // A paddle was passed → point to the other side.
  if (b.x + half < 0) scorePoint(w, "ai", targetScore, onMatchEnd);
  else if (b.x - half > COURT_W) scorePoint(w, "player", targetScore, onMatchEnd);
}

/* ------------------------------------------------------------------ */
/* Render helpers                                                      */
/* ------------------------------------------------------------------ */

function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function drawPaddle(
  ctx: CanvasRenderingContext2D,
  p: Paddle,
  color: string
): void {
  ctx.shadowColor = color;
  ctx.shadowBlur = 22;
  ctx.fillStyle = color;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillRect(p.x + p.w * 0.3, p.y + 4, p.w * 0.4, p.h - 8);
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function PongGame(props: GameProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const worldRef = useRef<World | null>(null);
  const sizeRef = useRef<{ w: number; h: number; dpr: number }>({
    w: 0,
    h: 0,
    dpr: 1,
  });
  const viewRef = useRef<{ s: number; ox: number; oy: number }>({
    s: 1,
    ox: 0,
    oy: 0,
  });
  const keysRef = useRef<{ up: boolean; down: boolean }>({
    up: false,
    down: false,
  });
  const dpadRef = useRef<{ dir: number; until: number }>({ dir: 0, until: 0 });
  const draggingRef = useRef(false);
  const gameOverSentRef = useRef(false);
  const propsRef = useRef(props);

  // Latest-props ref (read by the rAF loop + window listeners).
  useEffect(() => {
    propsRef.current = props;
  });

  // Lazy world init (per mount — the shell remounts us on restart).
  if (worldRef.current === null) {
    worldRef.current = createWorld(props.settings, props.difficulty);
  }

  /* ---------------------------------------------------------------- */
  /* 'pong_first' — on mount                                          */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    unlockAchievement("pong_first");
  }, []);

  /* ---------------------------------------------------------------- */
  /* Keyboard — ↑↓ / W S, hold to move smoothly                       */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const isHandled = (k: string): boolean =>
      k === "ArrowUp" ||
      k === "ArrowDown" ||
      k === "ArrowLeft" ||
      k === "ArrowRight" ||
      k === " " ||
      k === "w" ||
      k === "s" ||
      k === "W" ||
      k === "S";

    const down = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      const tag = tgt?.tagName;
      // Never fight with the game-over initials input or overlays.
      if (propsRef.current.paused || tag === "INPUT" || tag === "TEXTAREA") {
        return;
      }
      if (isHandled(e.key)) e.preventDefault();
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        keysRef.current.up = true;
      }
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        keysRef.current.down = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        keysRef.current.up = false;
      }
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        keysRef.current.down = false;
      }
    };
    const blur = () => {
      keysRef.current.up = false;
      keysRef.current.down = false;
    };

    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Touch: DPad taps glide the paddle                                */
  /* ---------------------------------------------------------------- */
  const handleDir = useCallback((d: Dir) => {
    if (d === "up") {
      dpadRef.current = { dir: -1, until: performance.now() / 1000 + 0.18 };
    } else if (d === "down") {
      dpadRef.current = { dir: 1, until: performance.now() / 1000 + 0.18 };
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /* Main loop: physics, HUD, rendering                               */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    ctxRef.current = ctx;

    const pr = propsRef.current;
    const target = parseTargetScore(pr.settings.targetScore);
    const diff = DIFFICULTY[parseDifficulty(pr.difficulty)];

    /* ---- HUD reporting (only on change) ---- */
    let lastScoreSent = -1;
    let lastStatsSent = "";
    const pushHud = () => {
      const w = worldRef.current;
      if (!w) return;
      const p = propsRef.current;
      const scoreVal = w.playerPoints * 100 + w.rally * 10;
      if (scoreVal !== lastScoreSent) {
        lastScoreSent = scoreVal;
        p.onScore(scoreVal);
      }
      const stats = `YOU ${w.playerPoints} — ${w.aiPoints} CPU · RALLY ${w.rally}`;
      if (stats !== lastStatsSent) {
        lastStatsSent = stats;
        p.onHudStats(stats);
      }
    };

    /* ---- match end (exactly once) ---- */
    const onMatchEnd = (won: boolean) => {
      if (gameOverSentRef.current) return;
      gameOverSentRef.current = true;
      const w = worldRef.current;
      if (!w) return;
      const finalScore =
        w.playerPoints * 100 + w.maxRally * 10 + (won ? 250 : 0);
      if (won) {
        playSfx("levelup");
        if (diff.hard) unlockAchievement("pong_win_hard");
      }
      // Player loss: end quietly — no lose jingle.
      propsRef.current.onGameOver(finalScore);
      pushHud();
    };

    /* ---- fixed-step simulation ---- */
    const doUpdate = (dt: number) => {
      const w = worldRef.current;
      if (!w || w.over) return;
      const now = performance.now() / 1000;

      // Player: held keys, then DPad glide impulse.
      let dir = 0;
      if (keysRef.current.up) dir -= 1;
      if (keysRef.current.down) dir += 1;
      if (dir === 0 && now < dpadRef.current.until) {
        dir = dpadRef.current.dir;
      }
      if (dir !== 0) {
        w.player.y += dir * PLAYER_SPEED * dt;
        clampPaddle(w.player);
      }

      // AI brain: re-aim on its reaction timer, then chase.
      w.brain.timer -= dt;
      if (w.brain.timer <= 0) {
        aiThink(w);
        w.brain.timer = w.brain.reactInterval;
      }
      aiMove(w, dt);

      // Ball + scoring (HUD pushed only when the values change).
      const pp = w.playerPoints;
      const ap = w.aiPoints;
      const rl = w.rally;
      updateBall(w, dt, target, onMatchEnd);
      if (w.playerPoints !== pp || w.aiPoints !== ap || w.rally !== rl) {
        pushHud();
      }

      // Ball trail: distance-based sampling so spacing stays even.
      if (!w.serving) {
        const last = w.trail[w.trail.length - 1];
        const dx = w.ball.x - (last ? last.x : -1e9);
        const dy = w.ball.y - (last ? last.y : -1e9);
        if (!last || dx * dx + dy * dy > 64) {
          w.trail.push({ x: w.ball.x, y: w.ball.y, life: 1 });
          if (w.trail.length > 18) w.trail.shift();
        }
      }
      for (let i = w.trail.length - 1; i >= 0; i--) {
        w.trail[i].life -= dt * 1.8;
        if (w.trail[i].life <= 0) w.trail.splice(i, 1);
      }

      // FX decay.
      if (w.flash > 0) w.flash = Math.max(0, w.flash - dt * 2.2);
      if (w.shake > 0) w.shake = Math.max(0, w.shake - dt * 26);
    };

    /* ---- renderer ---- */
    const render = (time: number) => {
      const w = worldRef.current;
      if (!w) return;
      const { w: cw, h: ch, dpr } = sizeRef.current;
      if (cw < 2 || ch < 2) return;

      const accent = propsRef.current.game.accent; // player (purple)
      const accent2 = propsRef.current.game.accent2; // AI (green)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#030208";
      ctx.fillRect(0, 0, cw, ch);

      // Letterbox the 16:10 court into the parent.
      const s = Math.min(cw / COURT_W, ch / COURT_H);
      const ox = (cw - COURT_W * s) / 2;
      const oy = (ch - COURT_H * s) / 2;
      viewRef.current = { s, ox, oy };

      const shk = w.shake;
      const shakeX = shk > 0 ? (Math.random() * 2 - 1) * shk : 0;
      const shakeY = shk > 0 ? (Math.random() * 2 - 1) * shk : 0;

      ctx.save();
      ctx.translate(ox + shakeX * s, oy + shakeY * s);
      ctx.scale(s, s);
      ctx.beginPath();
      ctx.rect(-shakeX, -shakeY, COURT_W + shakeX * 2, COURT_H + shakeY * 2);
      ctx.clip();

      // Court background.
      const bg = ctx.createLinearGradient(0, 0, 0, COURT_H);
      bg.addColorStop(0, "#0b0716");
      bg.addColorStop(0.5, "#0e0a20");
      bg.addColorStop(1, "#0b0716");
      ctx.fillStyle = bg;
      ctx.fillRect(-shakeX, -shakeY, COURT_W + shakeX * 2, COURT_H + shakeY * 2);

      // Center dashed line.
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 6;
      ctx.setLineDash([26, 22]);
      ctx.beginPath();
      ctx.moveTo(COURT_W / 2, WALL + 4);
      ctx.lineTo(COURT_W / 2, COURT_H - WALL - 4);
      ctx.stroke();
      ctx.setLineDash([]);

      // Big point numbers (shell HUD already shows the total score).
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `900 150px "Courier New", monospace`;
      ctx.fillStyle = hexA(accent, 0.26);
      ctx.fillText(String(w.playerPoints), COURT_W / 2 - 150, 168);
      ctx.fillStyle = hexA(accent2, 0.26);
      ctx.fillText(String(w.aiPoints), COURT_W / 2 + 150, 168);
      ctx.font = `700 30px "Courier New", monospace`;
      ctx.fillStyle = hexA(accent, 0.5);
      ctx.fillText("YOU", COURT_W / 2 - 150, 268);
      ctx.fillStyle = hexA(accent2, 0.5);
      ctx.fillText("CPU", COURT_W / 2 + 150, 268);

      // Match point pulse.
      if (
        !w.over &&
        (w.playerPoints === target - 1 || w.aiPoints === target - 1)
      ) {
        ctx.font = `700 34px "Courier New", monospace`;
        ctx.fillStyle = `rgba(255,255,255,${(
          0.22 + 0.18 * Math.sin(time * 5)
        ).toFixed(3)})`;
        ctx.fillText("MATCH POINT", COURT_W / 2, COURT_H - 110);
      }

      // Neon top/bottom walls (purple → green sweep).
      const wallGrad = ctx.createLinearGradient(0, 0, COURT_W, 0);
      wallGrad.addColorStop(0, accent);
      wallGrad.addColorStop(1, accent2);
      ctx.fillStyle = wallGrad;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(0, 0, COURT_W, WALL);
      ctx.fillRect(0, COURT_H - WALL, COURT_W, WALL);
      ctx.globalAlpha = 1;

      // Ball trail (cyan ghost squares).
      for (const d of w.trail) {
        const size = BALL_SIZE * (0.35 + 0.65 * d.life);
        ctx.fillStyle = `rgba(125,211,252,${(d.life * 0.35).toFixed(3)})`;
        ctx.fillRect(d.x - size / 2, d.y - size / 2, size, size);
      }

      // Paddles.
      drawPaddle(ctx, w.player, accent);
      drawPaddle(ctx, w.ai, accent2);

      // Ball — glowing white/cyan square (pulses while waiting to serve).
      const b = w.ball;
      const pulse = w.serving ? 1 + 0.18 * Math.sin(time * 7) : 1;
      const bs = b.size * pulse;
      ctx.shadowColor = "rgba(125,211,252,0.9)";
      ctx.shadowBlur = 26;
      ctx.fillStyle = "#dffaff";
      ctx.fillRect(b.x - bs / 2, b.y - bs / 2, bs, bs);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(b.x - bs * 0.3, b.y - bs * 0.3, bs * 0.6, bs * 0.6);

      // Score flash.
      if (w.flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${(w.flash * 0.22).toFixed(3)})`;
        ctx.fillRect(0, 0, COURT_W, COURT_H);
      }

      // Victory tint.
      if (w.over && w.won) {
        ctx.fillStyle = hexA(accent, 0.07);
        ctx.fillRect(0, 0, COURT_W, COURT_H);
      }

      // Court frame glow.
      ctx.strokeStyle = hexA(accent, 0.45);
      ctx.lineWidth = 3;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 16;
      ctx.strokeRect(1.5, 1.5, COURT_W - 3, COURT_H - 3);
      ctx.shadowBlur = 0;

      ctx.restore();

      // Scanlines + shimmer band (screen space, subtle).
      ctx.fillStyle = "rgba(0,0,0,0.09)";
      const scroll = (time * 26) % 4;
      for (let y = scroll - 4; y < ch; y += 4) {
        ctx.fillRect(0, y, cw, 1);
      }
      const bandY = (((time * 0.1) % 1.24) - 0.12) * ch;
      const band = ctx.createLinearGradient(0, bandY - 70, 0, bandY + 70);
      band.addColorStop(0, "rgba(190,225,255,0)");
      band.addColorStop(0.5, "rgba(190,225,255,0.05)");
      band.addColorStop(1, "rgba(190,225,255,0)");
      ctx.fillStyle = band;
      ctx.fillRect(0, bandY - 70, cw, 140);
    };

    /* ---- canvas sizing (ResizeObserver + DPR) ---- */
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.max(1, Math.round(rect.width));
      const ch = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      sizeRef.current = { w: cw, h: ch, dpr };
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    /* ---- rAF fixed-timestep loop ---- */
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.25) dt = 0.25; // tab-switch guard
      if (!propsRef.current.paused) {
        acc += dt;
        let steps = 0;
        while (acc >= STEP && steps < 60) {
          doUpdate(STEP);
          acc -= STEP;
          steps += 1;
        }
        if (acc > STEP) acc = 0;
      }
      render(now / 1000);
    };
    raf = requestAnimationFrame(frame);
    pushHud();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      ctxRef.current = null;
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Touch: pointer drag on the left half of the court                */
  /* ---------------------------------------------------------------- */
  const applyPointerY = (courtY: number) => {
    const w = worldRef.current;
    if (!w) return;
    const clamped = Math.max(
      WALL,
      Math.min(COURT_H - WALL - PADDLE_H, courtY - PADDLE_H / 2)
    );
    w.player.y = clamped;
  };

  const courtPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const view = viewRef.current;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    return { x: (cx - view.ox) / view.s, y: (cy - view.oy) / view.s };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = courtPoint(e);
    if (!pt) return;
    // Left half of the court controls the player paddle (small slack for
    // portrait letterboxing so thumbs on the bezel still work).
    if (pt.x > COURT_W / 2 + 80) return;
    draggingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer capture unavailable — drag still works inside the canvas */
    }
    if (e.cancelable) e.preventDefault();
    applyPointerY(pt.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) return;
    const pt = courtPoint(e);
    if (!pt) return;
    applyPointerY(pt.y);
  };

  const endDrag = useCallback(() => {
    draggingRef.current = false;
  }, []);

  /* ---------------------------------------------------------------- */

  return (
    <div className="relative flex h-full w-full min-h-0 select-none flex-col overflow-hidden">
      <div ref={wrapRef} className="relative min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          aria-label="PONG-72 photon court"
          className="absolute inset-0 block"
          style={{ touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        />
      </div>
      <div className="flex w-full shrink-0 justify-center">
        <DPad onDir={handleDir} />
      </div>
    </div>
  );
}
