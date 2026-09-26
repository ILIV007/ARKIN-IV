"use client";

import type { ArkTheme } from "@/store/console-store";
import { unlockAchievement } from "@/lib/storage/achievements";

const THEMES_KEY = "arkin4.themesUsed.v1";

/** Applies the theme class on <html> and syncs the body background. */
export function applyThemeClass(theme: ArkTheme) {
  const el = document.documentElement;
  el.classList.toggle("light", theme === "light");
  el.classList.toggle("dark", theme === "dark");
}

/** Tracks which themes the user has tried — unlocks the Mood Swinger trophy. */
export function recordThemeUse(theme: ArkTheme) {
  try {
    const raw = window.localStorage.getItem(THEMES_KEY);
    const used = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
    used.add(theme);
    window.localStorage.setItem(THEMES_KEY, JSON.stringify([...used]));
    if (used.size >= 2) unlockAchievement("theme_switcher");
  } catch {
    /* ignore */
  }
}
