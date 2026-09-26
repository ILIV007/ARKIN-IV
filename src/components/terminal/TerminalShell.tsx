"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { runCommand, autoComplete } from "./commands";
import type { OutputLine } from "./commands";
import { useConsoleStore } from "@/store/console-store";
import { unlockAudio, playSfx } from "@/lib/audio/chiptune";
import { useT } from "@/lib/i18n";
import { navigate } from "@/lib/router";

const WELCOME_LINES: OutputLine[] = [
  { text: "ARKIN-DOS 1.0 — TERMINAL SESSION STARTED", kind: "accent" },
  { text: "4 CARTRIDGES DETECTED · SOUND ONLINE · CRT CALIBRATED", kind: "dim" },
  { text: "", kind: "dim" },
  { text: "TYPE HELP TO LIST COMMANDS", kind: "ok" },
  { text: "", kind: "dim" },
];

const SHORTCUTS = [
  { label: "GAMES", path: "/games", color: "var(--ark-accent)" },
  { label: "SCORES", path: "/scores", color: "var(--ark-accent2)" },
  { label: "TROPHIES", path: "/trophies", color: "var(--ark-warn)" },
  { label: "SETTINGS", path: "/settings", color: "var(--ark-ok)" },
  { label: "ABOUT", path: "/about", color: "var(--ark-dim)" },
] as const;

export function TerminalShell() {
  const t = useT();
  const setTheme = useConsoleStore((s) => s.setTheme);
  const setCrtIntensity = useConsoleStore((s) => s.setCrtIntensity);
  const setSoundOn = useConsoleStore((s) => s.setSoundOn);

  const [lines, setLines] = useState<OutputLine[]>(WELCOME_LINES);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [cmdCount, setCmdCount] = useState(0);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(scrollToEnd, [lines, scrollToEnd]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const execute = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      playSfx("confirm");
      const echo: OutputLine[] = [
        { text: `${t.console.prompt} ${trimmed.toUpperCase()}`, kind: "cmd" },
      ];
      const result = runCommand(trimmed, {
        navigate,
        clear: () => setLines([]),
        reboot: () => {
          window.dispatchEvent(new Event("arkin:reboot"));
        },
        setTheme,
        setCrt: setCrtIntensity,
        setSound: setSoundOn,
        commandCount: cmdCount + 1,
      });
      setCmdCount((c) => c + 1);
      setHistory((h) => [trimmed, ...h].slice(0, 50));
      setHistIdx(-1);
      if (result.action === "clear") {
        setLines([]);
        return;
      }
      if (result.action === "reboot") {
        setLines([...echo, ...result.lines]);
        window.setTimeout(() => {
          window.dispatchEvent(new Event("arkin:reboot"));
        }, 900);
        return;
      }
      setLines((prev) => [...prev, ...echo, ...result.lines]);
      if (result.navigateTo) {
        window.setTimeout(() => navigate(result.navigateTo!), 500);
      }
    },
    [cmdCount, setCrtIntensity, setSoundOn, setTheme, t.console.prompt]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    unlockAudio();
    if (e.key === "Enter") {
      execute(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const next = Math.min(histIdx + 1, history.length - 1);
        setHistIdx(next);
        setInput(history[next]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = histIdx - 1;
      if (next < 0) {
        setHistIdx(-1);
        setInput("");
      } else {
        setHistIdx(next);
        setInput(history[next]);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const completion = autoComplete(input);
      if (completion) setInput(completion.toUpperCase());
    }
  };

  const kindClass = (k: OutputLine["kind"]) =>
    k === "cmd"
      ? "text-glow"
      : k === "ok"
        ? "ark-ok"
        : k === "err"
          ? "ark-err"
          : k === "dim"
            ? "ark-dim"
            : k === "accent"
              ? "ark-accent"
              : k === "title"
                ? "ark-accent-soft font-pixel text-[10px] sm:text-xs pt-2"
                : "ark-text";

  return (
    <div
      className="flex-1 flex flex-col min-h-0"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Terminal output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto ark-scroll px-3 sm:px-6 pt-4 pb-2 font-term text-[16px] sm:text-xl leading-snug"
        aria-live="polite"
        aria-label="Terminal output"
      >
        {lines.map((l, i) => (
          <div key={i} className={`whitespace-pre-wrap ${kindClass(l.kind)}`}>
            {l.text || "\u00A0"}
          </div>
        ))}
      </div>

      {/* Input row */}
      <div className="shrink-0 px-3 sm:px-6 pb-2 font-term text-[16px] sm:text-xl flex items-center gap-2">
        <span className="ark-accent text-glow shrink-0">{t.console.prompt}</span>
        <div className="relative flex-1 min-w-0">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full bg-transparent outline-none border-none ark-text caret-transparent font-term text-[16px] sm:text-xl uppercase placeholder:normal-case"
            placeholder="type a command… (help)"
            aria-label="Terminal command input"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
          {/* block caret overlay */}
          <span
            className="pointer-events-none absolute top-[2px] h-[1.15em] w-[0.6ch] bg-[var(--ark-accent)] caret-blink"
            style={{
              left: `calc(${input.length}ch + 0.05ch)`,
              opacity: 0.85,
            }}
          />
        </div>
      </div>

      {/* Shortcut bar */}
      <div className="shrink-0 border-t-2 ark-bc bg-[var(--ark-panel)]">
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 overflow-x-auto ark-scroll">
          <span className="ark-dim font-pixel text-[8px] pr-1 shrink-0 hidden sm:inline">
            MENU ▸
          </span>
          {SHORTCUTS.map((s) => (
            <button
              key={s.path}
              onClick={(e) => {
                e.stopPropagation();
                playSfx("select");
                navigate(s.path);
              }}
              className="shrink-0 font-pixel text-[8px] sm:text-[9px] px-2.5 sm:px-3 py-2 border-2 rounded-sm transition-all hover:scale-105 active:scale-95 no-touch-highlight"
              style={{
                color: s.color,
                borderColor: s.color,
                textShadow: `0 0 8px ${s.color}`,
              }}
              aria-label={s.label}
            >
              {s.label}
            </button>
          ))}
          <span className="ml-auto ark-dim font-term text-sm shrink-0 hidden md:inline pl-2">
            {t.console.ready.split("—")[1]?.trim() ?? ""}
          </span>
        </div>
      </div>
    </div>
  );
}
