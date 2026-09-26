"use client";

import { dictionaries } from "./en";
import { useConsoleStore } from "@/store/console-store";
import type { Dictionary } from "./en";

/**
 * Returns the active dictionary. English is the default;
 * more languages (fa, ...) will be added to `dictionaries` later.
 */
export function useT(): Dictionary {
  const language = useConsoleStore((s) => s.language);
  return dictionaries[language] ?? dictionaries.en;
}

export type { Dictionary };
