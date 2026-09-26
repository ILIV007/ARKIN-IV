"use client";

import { useCallback } from "react";
import { playSfx } from "@/lib/audio/chiptune";

export type Dir = "up" | "down" | "left" | "right";

/**
 * Touch-only D-Pad + action buttons. Invisible on pointer:fine devices
 * (CSS .touch-only), visible on phones/tablets.
 */
export function DPad({ onDir }: { onDir: (d: Dir) => void }) {
  const press = useCallback(
    (d: Dir) => () => {
      playSfx("move");
      onDir(d);
    },
    [onDir]
  );

  const base =
    "select-none active:scale-90 transition-transform flex items-center justify-center " +
    "bg-[var(--ark-panel2)] border-2 ark-bc text-[var(--ark-accent)] " +
    "rounded-md font-pixel text-sm h-12 w-12 no-touch-highlight";

  return (
    <div className="touch-only flex-col items-center gap-2 pb-3 pt-1 no-touch-highlight">
      <button className={base} onClick={press("up")} aria-label="Up">
        ▲
      </button>
      <div className="flex gap-2">
        <button className={base} onClick={press("left")} aria-label="Left">
          ◀
        </button>
        <button className={base} onClick={press("down")} aria-label="Down">
          ▼
        </button>
        <button className={base} onClick={press("right")} aria-label="Right">
          ▶
        </button>
      </div>
    </div>
  );
}

export function TouchActionButtons({
  actions,
}: {
  actions: { label: string; onPress: () => void }[];
}) {
  return (
    <div className="touch-only items-center gap-2 pb-3 no-touch-highlight">
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={() => {
            playSfx("select");
            a.onPress();
          }}
          className="select-none active:scale-90 transition-transform rounded-full h-14 w-14 font-pixel text-[9px] bg-[var(--ark-panel2)] border-2 ark-ba text-[var(--ark-accent-soft)] no-touch-highlight"
          aria-label={a.label}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
