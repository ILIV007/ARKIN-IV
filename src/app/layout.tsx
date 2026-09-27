import type { Metadata, Viewport } from "next";
import { Press_Start_2P, Space_Grotesk } from "next/font/google";
import "./globals.css";

const pixelFont = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
});

const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARKIN IV — Modern Retro Console",
  description:
    "ARKIN IV Entertainment System: a modern retro console simulator in your browser. Insert legendary cartridges — SERPENT.EXE, MUNCHER-84, BLOCKFALL, PONG-72 — chase high-scores on the world board, unlock trophies.",
  keywords: [
    "ARKIN IV",
    "retro games",
    "arcade",
    "console simulator",
    "snake",
    "pac-man",
    "tetris",
    "pong",
    "chiptune",
  ],
  authors: [{ name: "ARKIN Corp" }],
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "ARKIN IV Entertainment System",
    description: "A modern retro console simulator. Insert coin. Play. Survive.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070b15" },
    { media: "(prefers-color-scheme: light)", color: "#f2f4fb" },
  ],
};

/**
 * Applies the persisted theme BEFORE first paint (no flash of the wrong
 * theme). Reads the zustand-persist bucket `arkin4.console.v2`.
 */
const themeBootstrap = `
try {
  var raw = localStorage.getItem("arkin4.console.v2");
  var t = "dark";
  if (raw) {
    var parsed = JSON.parse(raw);
    if (parsed && parsed.state && parsed.state.theme === "light") t = "light";
  }
  var el = document.documentElement;
  el.classList.remove("light", "dark");
  el.classList.add(t);
} catch (e) {
  document.documentElement.classList.add("dark");
}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className={`${pixelFont.variable} ${grotesk.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
