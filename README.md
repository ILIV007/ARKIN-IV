# 🎮 ARKIN IV — Modern Retro Console

**ARKIN IV** is a modern retro console simulator that runs entirely in your browser. It boots up with a power-on animation, presents a cartridge library of 4 original arcade games, and plays real chiptune sound generated with the Web Audio API. Track your trophies, chase arcade high-score boards with 3-letter initials, switch between the dark **MIDNIGHT** and light **PURE WHITE** themes, enable optional CRT scanline effects, and play anywhere — the whole console is fully responsive with an on-screen touch D-Pad for mobile.

## ✨ Features

- 🕹️ **4 original cartridges**: `SERPENT.EXE` (snake), `MUNCHER-84` (pac-style), `BLOCKFALL` (tetris-style), `PONG-72`
- ⚡ **Power-on boot animation** with a full-page console bezel frame and power LED
- 🔊 **Chiptune Web Audio engine** — retro sound effects and music synthesized in-browser
- 🏆 **Trophy / achievement system** — 18 trophies to unlock across all games
- 📜 **Arcade high-score boards** with classic 3-letter initials
- 🌗 **Two themes**: dark MIDNIGHT + light PURE WHITE
- 📺 **Optional CRT effects** (off / low / full) for authentic retro feel
- 📱 **Full mobile support** — touch D-Pad, swipe and drag controls, responsive layout

## 🎮 Controls

**Keyboard**
- Arrows / WASD — move
- `P` — pause
- `Space` — hard drop (BLOCKFALL)

**Mobile**
- On-screen touch **D-Pad** for movement
- Swipe gestures and drag controls, depending on the game

## 🛠 Tech Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Canvas 2D · Web Audio API · Zustand · lucide icons

## 🏃 Run Locally

```bash
bun install
bun run dev
```

Then open → http://localhost:3000

## 🚀 Deploy to Cloudflare Workers

1. Push this repo to GitHub (already done if you are reading this on GitHub).
2. In the Cloudflare Dashboard go to **Workers & Pages → Create → Workers → Connect to Git** and select this repository.
3. Framework preset: **Next.js**; Build command: `npx @opennextjs/cloudflare build`; Deploy command: `npx @opennextjs/cloudflare deploy` (or simply use the included `wrangler.jsonc`).
4. Every push to `main` auto-deploys.

> **Note:** no database needed — scores and trophies are stored locally in the browser (localStorage).

---

# 🎮 آرکین IV — کنسول رتروی مدرن

**آرکین IV** یک شبیه‌ساز کنسول رتروی مدرن است که کاملاً در مرورگر اجرا می‌شود. کنسول با انیمیشن روشن‌شدن بوت می‌شود، کتابخانه کارتریج با ۴ بازی اصلی آرکید را نمایش می‌دهد و صدای چیپ‌تیون واقعی را با Web Audio API تولید می‌کند. جام‌های قهرمانی را جمع کنید، رکوردهای آرکید را با حروف اول ۳حرفی جابه‌جا کنید، بین تم شب **MIDNIGHT** و تم سفید **PURE WHITE** جابه‌جا شوید، افکت CRT اختیاری را روشن کنید و همه‌جا بازی کنید — کل کنسول کاملاً واکنش‌گراست و دکمه‌های لمسی (D-Pad) برای موبایل دارد.

## ✨ ویژگی‌ها

- 🕹️ **۴ کارتریج اصلی**: `SERPENT.EXE` (مار)، `MUNCHER-84` (پک‌مان‌طور)، `BLOCKFALL` (تتریس‌طور)، `PONG-72` (پنگ)
- ⚡ **انیمیشن روشن‌شدن** با قاب کنسول تمام‌صفحه و چراغ پاور
- 🔊 **موتور صدای چیپ‌تیون** — افکت‌ها و موسیقی رترو تولیدشده در مرورگر
- 🏆 **سیستم جام قهرمانی** — ۱۸ جام برای بازکردن در همه بازی‌ها
- 📜 **جدول رکوردهای آرکید** با حروف اول کلاسیک ۳حرفی
- 🌗 **دو تم**: شب MIDNIGHT + سفید PURE WHITE
- 📺 **افکت CRT اختیاری** (خاموش / کم / کامل) برای حس رتروی اصیل
- 📱 **پشتیبانی کامل موبایل** — دکمه‌های لمسی D-Pad، سوایپ و درگ، چیدمان واکنش‌گرا

## 🎮 کنترل‌ها

**کیبورد**
- جهت‌نما / WASD — حرکت
- `P` — توقف (Pause)
- `Space` — رهاسازی سریع در BLOCKFALL

**موبایل**
- دکمه‌های لمسی **D-Pad** روی صفحه برای حرکت
- ژست‌های سوایپ و درگ، بسته به بازی

## 🛠 فناوری‌ها

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Canvas 2D · Web Audio API · Zustand · lucide icons

## 🏃 اجرای محلی

```bash
bun install
bun run dev
```

سپس باز کنید → http://localhost:3000

## 🚀 دیپلوی روی Cloudflare Workers

1. این ریپازیتوری را به GitHub پوش کنید (اگر این متن را در GitHub می‌خوانید، این مرحله انجام شده است).
2. در داشبورد Cloudflare به بخش **Workers & Pages → Create → Workers → Connect to Git** بروید و همین ریپازیتوری را انتخاب کنید.
3. پریست فریم‌ورک: **Next.js**؛ دستور Build: `npx @opennextjs/cloudflare build`؛ دستور Deploy: `npx @opennextjs/cloudflare deploy` (یا به‌سادگی از فایل `wrangler.jsonc` همراه پروژه استفاده کنید).
4. هر پوش به شاخه `main` به‌صورت خودکار دیپلوی می‌شود.

> **توضیح:** به دیتابیس نیازی نیست — رکوردها و جام‌ها به‌صورت محلی در مرورگر (localStorage) ذخیره می‌شوند.
