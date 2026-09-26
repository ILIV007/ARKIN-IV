"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GAMES } from "@/lib/games/registry";
import { playSfx } from "@/lib/audio/chiptune";
import { unlockAchievement } from "@/lib/storage/achievements";

const LOGO = [
  "  █████╗ ██████╗ ██╗  ██╗██╗███╗   ██╗    ██╗██╗   ██╗",
  " ██╔══██╗██╔══██╗██║ ██╔╝██║████╗  ██║    ██║██║   ██║",
  " ███████║██████╔╝█████╔╝ ██║██╔██╗ ██║    ██║██║   ██║",
  " ██╔══██║██╔══██╗██╔═██╗ ██║██║╚██╗██║ ██ ██║██║   ██║",
  " ██║  ██║██║  ██║██║  ██╗██║██║ ╚████║ ╚█████╔╝╚██████╔╝",
  " ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝  ╚════╝  ╚═════╝",
];

interface BootLine {
  text: string;
  delay: number;
  kind?: "ok" | "dim" | "accent" | "logo" | "blank";
}

function buildLines(): BootLine[] {
  const lines: BootLine[] = [];
  const push = (text: string, delay = 140, kind?: BootLine["kind"]) =>
    lines.push({ text, delay, kind });

  push("ARKIN CORP. BIOS v1.04 — TOTAL SYSTEM CHECK", 90, "accent");
  push("(C) 1987-2026 ARKIN CORP. ALL RIGHTS RESERVED.", 90, "dim");
  push("", 60, "blank");
  push("CPU: Z80-A @ 3.58MHz .................. OK", 200);
  push("RAM: 640K (ENOUGH FOR ANYONE) ......... OK", 260);
  push("SOUND CHIP: SN76489 4-VOICE .......... OK", 180);
  push("CRT PHOSPHOR: P-22 VIOLET ............ OK", 160);
  push("AI COPROCESSOR: EMOTIONAL SUPPORT .... OK", 240, "ok");
  push("", 60, "blank");
  push("SCANNING CARTRIDGE SLOTS ...", 300, "accent");
  GAMES.forEach((g, i) => {
    push(`  SLOT ${i + 1}: ${g.title.padEnd(14, ".")} FOUND`, 220, "ok");
  });
  push("", 60, "blank");
  push("LOADING: ARKIN-DOS 1.0", 340, "accent");
  push("", 60, "blank");
  LOGO.forEach((l) => push(l, 26, "logo"));
  push("", 120, "blank");
  push("ENTERTAINMENT SYSTEM READY.", 180, "ok");
  push("PRESS ANY KEY / TAP TO CONTINUE", 99999, "dim");
  return lines;
}

export function BootSequence({ onDone }: { onDone: () => void }) {
  const [lines, setLines] = useState<BootLine[]>([]);
  const [done, setDone] = useState(false);
  const timerRef = useRef<number | null>(null);
  const linesRef = useRef<BootLine[]>(buildLines());

  const finish = useCallback(() => {
    if (done) return;
    setDone(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setLines(linesRef.current);
    playSfx("boot");
    unlockAchievement("first_boot");
    window.setTimeout(onDone, 650);
  }, [done, onDone]);

  useEffect(() => {
    let cancelled = false;
    let idx = 0;
    let acc = 0;
    const step = () => {
      if (cancelled || idx >= linesRef.current.length) {
        if (!cancelled && idx >= linesRef.current.length) finish();
        return;
      }
      const line = linesRef.current[idx];
      acc += line.delay;
      timerRef.current = window.setTimeout(() => {
        if (cancelled) return;
        setLines((prev) => [...prev, line]);
        idx++;
        step();
      }, line.delay);
    };
    step();
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [finish]);

  useEffect(() => {
    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [finish]);

  return (
    <div
      className="flex-1 flex flex-col min-h-0 font-term text-[15px] sm:text-lg p-4 sm:p-8 cursor-pointer overflow-hidden"
      onClick={finish}
      role="button"
      aria-label="Boot screen — press any key to skip"
    >
      <div className="flex-1 overflow-hidden">
        {lines.map((l, i) => (
          <div
            key={i}
            className={
              l.kind === "ok"
                ? "ark-ok"
                : l.kind === "dim"
                  ? "ark-dim"
                  : l.kind === "accent"
                    ? "ark-accent text-glow"
                    : l.kind === "logo"
                      ? "font-pixel ark-accent-soft text-[6px] sm:text-[10px] leading-[1.7] text-glow"
                      : ""
            }
          >
            {l.text || "\u00A0"}
          </div>
        ))}
        {!done && (
          <span className="inline-block w-2.5 h-4 bg-[var(--ark-accent)] caret-blink" />
        )}
      </div>
      <div className="shrink-0 ark-dim font-pixel text-[8px] sm:text-[9px] pt-2 text-right">
        {done ? "" : "PRESS ANY KEY TO SKIP ▸"}
      </div>
    </div>
  );
}
