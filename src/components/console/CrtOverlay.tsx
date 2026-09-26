"use client";

import { useConsoleStore } from "@/store/console-store";

/**
 * CrtOverlay — optional decorative CRT layer (scanlines / vignette / flicker).
 * Fully hidden in light theme for a clean white studio look.
 */
export function CrtOverlay() {
  const intensity = useConsoleStore((s) => s.crtIntensity);
  const scanlines = useConsoleStore((s) => s.scanlines);
  const flicker = useConsoleStore((s) => s.flicker);
  const theme = useConsoleStore((s) => s.theme);

  if (intensity === "off" || theme === "light" || !scanlines) return null;

  return (
    <div
      aria-hidden
      className={`crt-layer ${
        intensity === "high" ? "crt-high" : "crt-low"
      } ${flicker ? "crt-flicker" : ""}`}
    >
      <div className="crt-scan absolute inset-0" />
      <div className="crt-vignette absolute inset-0" />
    </div>
  );
}
