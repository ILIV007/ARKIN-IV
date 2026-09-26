import type { Metadata, Viewport } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const pixelFont = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
});

const termFont = VT323({
  variable: "--font-term",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARKIN-IV — Retro Arcade Terminal",
  description:
    "ARKIN-IV Entertainment System: a retro console simulator in your browser. Boot the terminal, insert cartridges, and play classic arcade games — Snake, Pac-style Muncher, Tetris-style Blockfall and Pong.",
  keywords: [
    "ARKIN IV",
    "retro games",
    "arcade",
    "terminal",
    "snake",
    "pac-man",
    "tetris",
    "pong",
    "CRT",
  ],
  authors: [{ name: "ARKIN Corp" }],
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "ARKIN-IV Entertainment System",
    description: "A retro console simulator. Type, play, survive.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0b0f1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${pixelFont.variable} ${termFont.variable} antialiased bg-black`}
      >
        {children}
      </body>
    </html>
  );
}
