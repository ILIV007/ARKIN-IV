"use client";

import { navigate } from "@/lib/router";
import { playSfx } from "@/lib/audio/chiptune";
import { GAMES } from "@/lib/games/registry";

const ART = [
  "  █████╗ ██████╗ ██╗  ██╗██╗███╗   ██╗    ██╗██╗   ██╗",
  " ██╔══██╗██╔══██╗██║ ██╔╝██║████╗  ██║    ██║██║   ██║",
  " ███████║██████╔╝█████╔╝ ██║██╔██╗ ██║    ██║██║   ██║",
  " ██╔══██║██╔══██╗██╔═██╗ ██║██║╚██╗██║ ██ ██║██║   ██║",
  " ██║  ██║██║  ██║██║  ██╗██║██║ ╚████║ ╚█████╔╝╚██████╔╝",
  " ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝  ╚════╝  ╚═════╝",
];

export function AboutPage() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 flex items-center justify-between px-3 sm:px-6 py-3 border-b-2 ark-bc">
        <div className="font-pixel text-[11px] sm:text-sm ark-accent text-glow">
          ABOUT ARKIN-IV
        </div>
        <button
          onClick={() => {
            playSfx("back");
            navigate("/");
          }}
          className="font-pixel text-[8px] px-3 py-2 border-2 ark-bc ark-dim hover:ark-ba hover:ark-accent rounded-sm transition-colors no-touch-highlight"
        >
          ◂ TERMINAL
        </button>
      </div>

      <div className="flex-1 overflow-y-auto ark-scroll px-4 sm:px-8 py-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-5">
          <pre className="font-pixel text-[6px] sm:text-[9px] leading-[1.9] ark-accent-soft text-glow hidden sm:block" aria-hidden>
            {ART.join("\n")}
          </pre>

          <div className="font-term text-lg sm:text-xl leading-relaxed ark-text space-y-3">
            <p>
              <span className="ark-accent font-pixel text-[10px]">THE LEGEND ▸</span>{" "}
              Forged in 1987 by the <span className="ark-ok">ARKIN CORP.</span>, the
              ARKIN-IV was the last console ever built with a heart. While other
              machines chased polygons, the IV chased <em>feeling</em> — the click of a
              cartridge, the hum of a phosphor tube, the terror of a final life.
            </p>
            <p>
              It slept for decades in a warehouse basement... until someone booted it
              up inside your browser. Now the grid runs again: 4 cartridges, a talking
              terminal, and a trophy cabinet waiting to be filled.
            </p>
            <p className="ark-dim">
              SPEC SHEET: Z80-A @ 3.58MHz · 640K RAM · SN76489 4-voice sound chip ·
              P-22 violet phosphor CRT · one very determined AI coprocessor.
            </p>
          </div>

          <div className="ark-panel border-2 ark-bc rounded-md p-4">
            <div className="font-pixel text-[9px] ark-dim mb-2">CARTRIDGE ROSTER</div>
            <ul className="font-term text-lg space-y-1">
              {GAMES.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => {
                      playSfx("select");
                      navigate(`/games/${g.id}`);
                    }}
                    className="hover:underline text-left no-touch-highlight"
                    style={{ color: g.accent }}
                  >
                    ▸ {g.title}
                  </button>
                  <span className="ark-dim"> — {g.tagline}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-center font-term text-base ark-dim pb-2">
            ARKIN-IV · built with ♥, CSS scanlines and zero external sprite assets ·
            scores live in your browser only
          </div>
        </div>
      </div>
    </div>
  );
}
