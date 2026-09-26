"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { GameProps } from "./shared/types";

const loading = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="font-pixel text-[10px] ark-accent text-glow animate-pulse">
      LOADING CARTRIDGE…
    </div>
  </div>
);

export const GAME_COMPONENTS: Record<string, ComponentType<GameProps>> = {
  snake: dynamic(() => import("./SnakeGame"), { ssr: false, loading }),
  muncher: dynamic(() => import("./PacGame"), { ssr: false, loading }),
  blockfall: dynamic(() => import("./TetrisGame"), { ssr: false, loading }),
  pong: dynamic(() => import("./PongGame"), { ssr: false, loading }),
};
