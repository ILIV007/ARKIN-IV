"use client";

import { Github, ChevronUp } from "lucide-react";
import { navigate } from "@/lib/router";
import { useT } from "@/lib/i18n";

export function Footer() {
  const t = useT();
  return (
    <footer
      className="mt-auto border-t"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-2)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="font-pixel text-[9px] ark-text">
            ARKIN{" "}
            <span style={{ color: "var(--neon-soft)" }}>IV</span>
          </span>
          <span className="ark-dim text-xs">· {t.footer.tagline} · v2.0</span>
        </div>

        <nav className="flex items-center gap-4 text-xs" aria-label="Footer">
          <button
            onClick={() => navigate("#/scores")}
            className="ark-dim hover:ark-accent transition-colors no-touch-highlight"
          >
            {t.nav.scores}
          </button>
          <button
            onClick={() => navigate("#/trophies")}
            className="ark-dim hover:ark-accent transition-colors no-touch-highlight"
          >
            {t.nav.trophies}
          </button>
          <button
            onClick={() => navigate("#/about")}
            className="ark-dim hover:ark-accent transition-colors no-touch-highlight"
          >
            {t.nav.about}
          </button>
          <a
            href="https://github.com/ILIV007/ARKIN-IV"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 ark-dim hover:ark-accent transition-colors"
            aria-label="GitHub source"
          >
            <Github size={14} />
            {t.footer.source}
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <span className="ark-dim text-xs">{t.footer.rights}</span>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="icon-btn h-8 w-8"
            aria-label="Back to top"
          >
            <ChevronUp size={14} />
          </button>
        </div>
      </div>
    </footer>
  );
}
