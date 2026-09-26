"use client";

import { useState } from "react";
import { Sun, Moon, Volume2, VolumeX, Settings, Menu, X } from "lucide-react";
import { useHashRoute, navigate } from "@/lib/router";
import { useConsoleStore } from "@/store/console-store";
import { applyThemeClass, recordThemeUse } from "@/lib/theme";
import { playSfx } from "@/lib/audio/chiptune";
import { useT } from "@/lib/i18n";
import type { ArkTheme } from "@/store/console-store";

export function TopBar() {
  const t = useT();
  const [route] = useHashRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const theme = useConsoleStore((s) => s.theme);
  const soundOn = useConsoleStore((s) => s.soundOn);
  const setTheme = useConsoleStore((s) => s.setTheme);
  const setSoundOn = useConsoleStore((s) => s.setSoundOn);

  const toggleTheme = () => {
    const next: ArkTheme = theme === "dark" ? "light" : "dark";
    playSfx("select");
    setTheme(next);
    applyThemeClass(next);
    recordThemeUse(next);
  };

  const links: { href: string; label: string; active: boolean }[] = [
    { href: "#/", label: t.nav.library, active: route.name === "home" },
    { href: "#/scores", label: t.nav.scores, active: route.name === "scores" },
    { href: "#/trophies", label: t.nav.trophies, active: route.name === "trophies" },
    { href: "#/about", label: t.nav.about, active: route.name === "about" },
  ];

  const go = (href: string) => {
    playSfx("select");
    setMenuOpen(false);
    navigate(href);
  };

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{
        borderColor: "var(--border)",
        background: "var(--topbar)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
        {/* logo */}
        <button
          onClick={() => go("/")}
          className="flex items-center gap-2.5 rounded-lg px-1 py-1 no-touch-highlight"
          aria-label="ARKIN IV home"
        >
          <LogoMark />
          <span className="font-pixel text-[10px] sm:text-xs ark-text">
            ARKIN{" "}
            <span style={{ color: "var(--neon-soft)", textShadow: "0 0 12px var(--neon-glow)" }}>
              IV
            </span>
          </span>
          <span
            className="hidden md:inline-block h-3.5 w-2 blink"
            style={{ background: "var(--neon-soft)" }}
            aria-hidden
          />
        </button>

        {/* nav links (desktop) */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
          {links.map((l) => (
            <button
              key={l.href}
              onClick={() => go(l.href)}
              className="rounded-lg px-3 py-2 font-pixel text-[8px] transition-colors no-touch-highlight"
              style={{
                color: l.active ? "var(--neon-soft)" : "var(--dim)",
                background: l.active ? "rgba(176,38,255,0.10)" : "transparent",
                textShadow: l.active ? "0 0 10px var(--neon-glow)" : "none",
              }}
              aria-current={l.active ? "page" : undefined}
            >
              {l.label}
            </button>
          ))}
        </nav>

        {/* actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={toggleTheme}
            className="icon-btn"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "PURE WHITE" : "MIDNIGHT"}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => {
              playSfx("select");
              setSoundOn(!soundOn);
            }}
            className="icon-btn"
            aria-label={soundOn ? "Mute sound" : "Enable sound"}
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            onClick={() => go("#/settings")}
            className="icon-btn"
            aria-label={t.nav.settings}
          >
            <Settings size={16} />
          </button>
          <button
            onClick={() => {
              playSfx("select");
              setMenuOpen((o) => !o);
            }}
            className="icon-btn md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* mobile menu */}
      {menuOpen && (
        <nav
          className="md:hidden border-t px-3 py-2 flex flex-col gap-1"
          aria-label="Mobile"
          style={{ borderColor: "var(--border)", background: "var(--bg-2)" }}
        >
          {links.map((l) => (
            <button
              key={l.href}
              onClick={() => go(l.href)}
              className="rounded-lg px-3 py-3 text-left font-pixel text-[9px] no-touch-highlight"
              style={{
                color: l.active ? "var(--neon-soft)" : "var(--dim)",
                background: l.active ? "rgba(176,38,255,0.10)" : "transparent",
              }}
              aria-current={l.active ? "page" : undefined}
            >
              {l.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}

function LogoMark() {
  return (
    <span
      className="grid h-8 w-8 place-items-center rounded-lg"
      style={{
        background: "linear-gradient(135deg, rgba(176,38,255,0.25), rgba(34,211,238,0.18))",
        border: "1px solid var(--border-2)",
      }}
      aria-hidden
    >
      <span
        className="block h-2.5 w-2.5 rounded-[2px]"
        style={{ background: "var(--neon-soft)", boxShadow: "0 0 10px var(--neon-glow)" }}
      />
    </span>
  );
}
