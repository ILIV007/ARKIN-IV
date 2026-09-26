"use client";

import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { ConsoleFrame } from "@/components/console/ConsoleFrame";
import { CrtOverlay } from "@/components/console/CrtOverlay";
import { PowerOn, powerOnSeen } from "@/components/console/PowerOn";
import { TopBar } from "@/components/console/TopBar";
import { Footer } from "@/components/console/Footer";
import { HomePage } from "@/components/home/HomePage";
import { GameShell } from "@/components/games/shared/GameShell";
import { ScoresPage } from "@/components/console/pages/ScoresPage";
import { SettingsPage } from "@/components/console/pages/SettingsPage";
import { AboutPage } from "@/components/console/pages/AboutPage";
import { TrophiesPage } from "@/components/console/pages/TrophiesPage";
import { useHashRoute, navigate } from "@/lib/router";
import type { Route } from "@/lib/router";
import { getGame } from "@/lib/games/registry";
import { useConsoleStore } from "@/store/console-store";
import { applyThemeClass, recordThemeUse } from "@/lib/theme";
import { unlockAudio, playSfx } from "@/lib/audio/chiptune";
import { unlockAchievement } from "@/lib/storage/achievements";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

function KonamiListener() {
  const unlockKonami = useConsoleStore((s) => s.unlockKonami);
  const konamiUnlocked = useConsoleStore((s) => s.konamiUnlocked);

  useEffect(() => {
    let progress = 0;
    const onKey = (e: KeyboardEvent) => {
      const expected = KONAMI[progress];
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === expected) {
        progress++;
        if (progress === KONAMI.length) {
          progress = 0;
          if (!konamiUnlocked) {
            unlockKonami();
            unlockAchievement("konami");
            playSfx("power");
          }
        }
      } else {
        progress = key === KONAMI[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unlockKonami, konamiUnlocked]);

  return null;
}

/** Applies persisted theme + CRT class to <html> and keeps them in sync. */
function ThemeSync() {
  const theme = useConsoleStore((s) => s.theme);
  const crtIntensity = useConsoleStore((s) => s.crtIntensity);

  useEffect(() => {
    applyThemeClass(theme);
    recordThemeUse(theme);
  }, [theme]);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.remove("crt-low", "crt-high");
    if (crtIntensity === "low") el.classList.add("crt-low");
    if (crtIntensity === "high") el.classList.add("crt-high");
  }, [crtIntensity]);

  return null;
}

function RouteScreen({ route }: { route: Route }) {
  switch (route.name) {
    case "game": {
      const game = getGame(route.gameId);
      if (!game) {
        return (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
            <div className="text-5xl" aria-hidden>📼</div>
            <div className="font-pixel text-[10px] ark-err">
              CARTRIDGE NOT FOUND: {route.gameId.toUpperCase()}
            </div>
            <button
              onClick={() => {
                playSfx("back");
                navigate("/");
              }}
              className="btn-pixel px-5 py-3.5 font-pixel text-[9px] ark-dim"
            >
              ◂ LIBRARY
            </button>
          </div>
        );
      }
      return <GameShell key={route.gameId} game={game} />;
    }
    case "scores":
      return <ScoresPage />;
    case "trophies":
      return <TrophiesPage />;
    case "settings":
      return <SettingsPage />;
    case "about":
      return <AboutPage />;
    default:
      return <HomePage />;
  }
}

export default function Home() {
  const [booted, setBooted] = useState(true);
  const [route] = useHashRoute();

  // show the power-on animation once per session (client-side only)
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!powerOnSeen()) setBooted(false);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  // unlock audio on first user gesture (browser policy)
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // touch capability detection → show D-Pads on any touch device
  useEffect(() => {
    const isTouch =
      window.matchMedia("(pointer: coarse)").matches ||
      navigator.maxTouchPoints > 0 ||
      "ontouchstart" in window ||
      /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
    if (isTouch) document.documentElement.classList.add("js-touch");
  }, []);

  const finishBoot = useCallback(() => setBooted(true), []);

  // Game routes need a DEFINITE height (h-dvh) so the game canvases'
  // h-full percentage chains resolve. Other routes scroll normally.
  const isGame = route.name === "game";

  return (
    <>
      <KonamiListener />
      <ThemeSync />
      <Toaster position="bottom-right" gap={8} offset={14} closeButton />

      <ConsoleFrame />
      <CrtOverlay />

      <div
        className={`relative z-10 flex flex-col px-3 pt-1.5 sm:px-5 sm:pt-3 ${
          isGame ? "h-dvh overflow-hidden" : "min-h-dvh"
        }`}
      >
        <TopBar />
        <main
          className="flex min-h-0 flex-1 flex-col"
          aria-label="ARKIN IV main screen"
        >
          <RouteScreen route={route} />
        </main>
        <Footer />
      </div>

      {!booted && <PowerOn onDone={finishBoot} />}
    </>
  );
}
