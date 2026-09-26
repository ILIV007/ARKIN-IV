"use client";

import { Gamepad2, Github, Layers, Music4, Smartphone, Trophy } from "lucide-react";
import { useT } from "@/lib/i18n";

export function AboutPage() {
  const t = useT();

  const tech = [
    { icon: <Layers size={14} />, label: "Next.js 16 · React 19" },
    { icon: <Gamepad2 size={14} />, label: "Canvas 2D Engines" },
    { icon: <Music4 size={14} />, label: "Web Audio Chiptune" },
    { icon: <Trophy size={14} />, label: "Local Trophy & Score Vault" },
    { icon: <Smartphone size={14} />, label: "Touch · D-Pad · Keyboard" },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-9 text-center">
        <h1 className="font-pixel text-sm sm:text-lg">
          <span className="ark-text">ABOUT </span>
          <span style={{ color: "var(--neon-soft)", textShadow: "0 0 20px var(--neon-glow)" }}>
            ARKIN IV
          </span>
        </h1>
        <p className="mt-3 text-sm ark-dim sm:text-base">{t.about.sub}</p>
      </header>

      {/* story */}
      <section className="surface mb-4 p-6 sm:p-8">
        <h2 className="mb-3 font-pixel text-[9px] ark-dim">{t.about.storyTitle}</h2>
        <p className="text-base leading-relaxed ark-text sm:text-lg">{t.about.story}</p>
      </section>

      {/* tech */}
      <section className="surface mb-4 p-6 sm:p-8">
        <h2 className="mb-4 font-pixel text-[9px] ark-dim">{t.about.techTitle}</h2>
        <ul className="flex flex-wrap gap-2.5">
          {tech.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm ark-text"
              style={{ borderColor: "var(--border)", background: "var(--panel-2)" }}
            >
              <span style={{ color: "var(--neon-soft)" }}>{item.icon}</span>
              {item.label}
            </li>
          ))}
        </ul>
      </section>

      {/* open source */}
      <section
        className="surface flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center sm:p-8"
        style={{ background: "linear-gradient(135deg, var(--panel), var(--panel-2))" }}
      >
        <div>
          <h2 className="font-pixel text-[9px]" style={{ color: "var(--neon-soft)" }}>
            {t.about.linkTitle}
          </h2>
          <p className="mt-2 max-w-sm text-sm ark-dim">{t.about.linkDesc}</p>
        </div>
        <a
          href="https://github.com/ILIV007/ARKIN-IV"
          target="_blank"
          rel="noreferrer"
          className="btn-pixel flex items-center gap-2 px-5 py-3.5 font-pixel text-[9px]"
          style={{ color: "var(--text)", borderColor: "var(--border-2)", background: "var(--panel)" }}
        >
          <Github size={14} />
          GITHUB
        </a>
      </section>

      <p className="mt-8 text-center font-pixel text-[7px] ark-dim">
        {t.about.version}: ARKIN-IV v2.0 · MODERN RETRO CONSOLE
      </p>
    </div>
  );
}
