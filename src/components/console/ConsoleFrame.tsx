"use client";

/**
 * ConsoleFrame — the physical body of the ARKIN IV.
 * A fixed decorative bezel that surrounds the entire viewport:
 * corners, screws and a breathing power LED. Purely visual.
 */
export function ConsoleFrame() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70]">
      {/* main bezel */}
      <div
        className="absolute inset-1.5 sm:inset-2.5 rounded-xl sm:rounded-2xl border-2"
        style={{
          borderColor: "var(--frame)",
          boxShadow:
            "0 0 0 1px rgba(0,0,0,0.25) inset, 0 0 70px -18px var(--frame-glow)",
        }}
      />
      {/* inner hairline for depth */}
      <div
        className="absolute inset-[9px] sm:inset-[13px] rounded-lg sm:rounded-xl border"
        style={{ borderColor: "var(--border)" }}
      />
      {/* corner screws */}
      <Screw className="top-[5px] left-[5px] sm:top-[9px] sm:left-[9px]" />
      <Screw className="top-[5px] right-[5px] sm:top-[9px] sm:right-[9px]" />
      <Screw className="bottom-[5px] left-[5px] sm:bottom-[9px] sm:left-[9px]" />
      <Screw className="bottom-[5px] right-[5px] sm:bottom-[9px] sm:right-[9px]" />
      {/* power LED */}
      <div className="absolute bottom-[7px] right-[22px] sm:bottom-[12px] sm:right-[34px] flex items-center">
        <span
          className="block h-1.5 w-1.5 rounded-full pulse-glow"
          style={{ background: "var(--ok)" }}
        />
      </div>
    </div>
  );
}

function Screw({ className }: { className: string }) {
  return (
    <span
      className={`absolute h-[7px] w-[7px] rounded-full sm:h-2 sm:w-2 ${className}`}
      style={{
        background:
          "radial-gradient(circle at 35% 30%, var(--border-2), var(--bg-2) 70%)",
        boxShadow: "0 0 0 1px var(--border)",
      }}
    />
  );
}
