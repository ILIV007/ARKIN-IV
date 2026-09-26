"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { CrtFrame } from "@/components/console/CrtFrame";
import { BootSequence } from "@/components/console/BootSequence";
import { TerminalShell } from "@/components/terminal/TerminalShell";
import { GamesMenu } from "@/components/terminal/GamesMenu";
import { GameShell } from "@/components/games/shared/GameShell";
import { ScoresPage } from "@/components/console/pages/ScoresPage";
import { SettingsPage } from "@/components/console/pages/SettingsPage";
import { AboutPage } from "@/components/console/pages/AboutPage";
import { TrophiesPage } from "@/components/console/pages/TrophiesPage";
import { useHashRoute, navigate } from "@/lib/router";
import { getGame } from "@/lib/games/registry";
import { useConsoleStore } from "@/store/console-store";
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

function ScreenContent() {
  const [route] = useHashRoute();

  switch (route.name) {
    case "games":
      return <GamesMenu />;
    case "game": {
      const game = getGame(route.gameId);
      if (!game) {
        return (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="text-5xl">📼</div>
            <div className="font-pixel text-[11px] ark-err">
              CARTRIDGE NOT FOUND: {route.gameId.toUpperCase()}
            </div>
            <button
              onClick={() => {
                playSfx("back");
                navigate("/games");
              }}
              className="font-pixel text-[9px] px-4 py-3 border-2 ark-ba ark-accent rounded-sm"
            >
              ◂ BACK TO SHELF
            </button>
          </div>
        );
      }
      return <GameShell key={route.gameId} game={game} />;
    }
    case "scores":
      return <ScoresPage />;
    case "settings":
      return <SettingsPage />;
    case "about":
      return <AboutPage />;
    case "trophies":
      return <TrophiesPage />;
    default:
      return <TerminalShell />;
  }
}

export default function Home() {
  const [booted, setBooted] = useState(false);
  const [powerOn, setPowerOn] = useState(true);
  const [bootKey, setBootKey] = useState(0);

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
      "ontouchstart" in window;
    if (isTouch) document.documentElement.classList.add("js-touch");
  }, []);

  const finishBoot = () => setBooted(true);

  const replayBoot = () => {
    setBooted(false);
    setPowerOn(false);
    window.setTimeout(() => {
      setBootKey((k) => k + 1);
      setPowerOn(true);
    }, 420);
  };

  return (
    <main className="h-dvh w-full flex flex-col" aria-label="ARKIN-IV console main screen">
      <KonamiListener />
      <Toaster
        position="bottom-right"
        gap={8}
        offset={12}
        closeButton
      />
      <div className={`flex-1 min-h-0 ${powerOn ? "crt-power-on" : "crt-power-off"}`}>
        <CrtFrame>
          {!booted ? (
            <BootSequence key={bootKey} onDone={finishBoot} />
          ) : (
            <ScreenContent />
          )}
        </CrtFrame>
      </div>
      {/* exposes replayBoot for future terminal REBOOT command usage via event */}
      <BootReplayBus onReplay={replayBoot} />
    </main>
  );
}

function BootReplayBus({ onReplay }: { onReplay: () => void }) {
  useEffect(() => {
    const handler = () => onReplay();
    window.addEventListener("arkin:reboot", handler);
    return () => window.removeEventListener("arkin:reboot", handler);
  }, [onReplay]);
  return null;
}
