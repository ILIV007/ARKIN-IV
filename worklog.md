# ARKIN IV — Shared Worklog

---
Task ID: 1
Agent: Main Agent (Z.ai Code)
Task: تحقیق، تحلیل معماری و نگارش رودمپ کامل برای سایت آرکید ترمینالی ARKIN IV

Work Log:
- بررسی ساختار پروژه Next.js 16 موجود (shadcn/ui کامل، Prisma آماده)
- تحقیق وب: دیپلوی Next.js روی Cloudflare Workers از طریق @opennextjs/cloudflare + Workers Builds Git integration
- تحقیق وب: افکت‌های CRT/ترمینال با CSS خالص و فونت‌های پیکسلی
- نگارش ROADMAP.md (نسخه 1.0 و سپس 1.1 با تایید کاربر)

Stage Summary:
- سند نهایی: /home/z/my-project/ROADMAP.md — تصمیم‌ها: کارتریج مجازی hash-route، ۴ تم (شامل PURE WHITE سفید)، Canvas 2D، Zustand+localStorage، Web Audio

---
Task ID: 2
Agent: Main Agent (Z.ai Code)
Task: ساخت فاز ۱ و ۲ — هسته کنسول ARKIN-IV (فاندیشن + ترمینال + GameShell)

Work Log:
- layout.tsx: فونت‌های Press_Start_2P (--font-pixel) و VT323 (--font-term)، متادیتا ARKIN-IV، favicon.svg پیکسلی
- globals.css: ۴ تم کامل (neon-night / pure-white / phosphor-green / amber-crt) با متغیرهای --ark-*، افکت‌های CRT (scanlines، vignette، flicker، power-on/off، glitch)، pixel-border، scrollbar سفارشی، touch-only، prefers-reduced-motion
- store/console-store.ts: zustand+persist (تم، CRT intensity، scanlines، flicker، sound، volume، language، konami، bootSeen)
- lib/i18n: en.ts دیکشنری + useT() هوک — آماده برای زبان‌های بعدی
- lib/audio/chiptune.ts: موتور Web Audio سینت سایزر با ۱۸ افکت صوتی (eat, coin, die, power, levelup, achieve, boot...) — lazy AudioContext + unlock روی اولین gesture
- lib/storage/highscores.ts: جدول رکورد top-10 با امضای ۳ حرفی + localStorage
- lib/storage/achievements.ts: ۲۰ تروفی (بازی‌محور + مخفی) + توست sonner با استایل ARK
- lib/router.ts: useHashRoute — مسیرهای home/games/game/<id>/scores/settings/about/trophies روی hash
- lib/games/registry.ts: ۴ کارتریج با lore، world، settings schema، difficulty، scoreAchievements
- components/console/CrtFrame.tsx: قاب کنسول با bezel + LED + صفحه CRT
- components/console/BootSequence.tsx: بوت BIOS کامل (چک سخت‌افزار، اسکن کارتریج، لوگوی ASCII) قابل skip
- components/terminal/commands.ts: ۱۶ دستور ترمینال + easter eggs (hack/matrix) + autocomplete
- components/terminal/TerminalShell.tsx: ترمینال تعاملی با تاریخچه ↑↓، Tab، نوار میانبر پیکسلی
- components/terminal/GamesMenu.tsx: قفسه کارتریج با کیبورد/کلیک
- components/games/shared/GameShell.tsx: چرخه کامل intro→settings→playing→pause→gameover→initials→scores
- components/console/pages/: ScoresPage، SettingsPage، AboutPage، TrophiesPage
- app/page.tsx: روت اصلی — بوت + روتر + کد کنامی + BootReplayBus (دستور REBOOT ترمینال → انیمیشن CRT)
- باگ‌فیکس‌ها: index.ts→index.tsx (JSX)، setState-in-effect→useMemo، حذف کامپوننت‌های render-time، ارتفاع ark-root→stretch، ری‌استارت dev server برای cache
- تایید مرورگر: بوت ✅، ترمینال ✅، توست تروفی ✅، پر شدن صفحه ✅، lint: 0 error

Stage Summary:
- فاندیشن کامل و تست‌شده است. بازی‌ها placeholder هستند.
- قرارداد بازی‌ها: src/components/games/shared/types.ts (GameProps) + رجیستری
- بازی‌سازها باید فقط فایل خودشان را بنویسند: SnakeGame.tsx / PacGame.tsx / TetrisGame.tsx / PongGame.tsx (default export, props GameProps)

## 🎮 GAME CONTRACT (برای Task 3-a تا 3-d — الزامی)
1. فایل: src/components/games/<X>.tsx — `export default function XGame(props: GameProps)`
2. Canvas 2D داخل div والد (والد flex-1 است): canvas با ResizeObserver به اندازه والد + devicePixelRatio scale
3. حلقه: requestAnimationFrame + fixed timestep accumulator (در useRef، نه state). اگر props.paused=true فقط رندر، بدون update
4. کیبورد: window keydown، preventDefault برای Arrow/Space/WASD، cleanup در unmount
5. لمسی: از '@/components/console/DPad' → <DPad onDir={d=>...}/> و <TouchActionButtons actions={[...]}/> (خودش touch-only است) + swipe روی canvas برای snake/muncher
6. صدا: import { playSfx } from '@/lib/audio/chiptune' — فقط نام‌های مجاز SfxName
7. تروفی: import { unlockAchievement } from '@/lib/storage/achievements' — مستقیم صدا بزن
8. HUD: props.onScore(score) هر تغییر امتیاز، props.onHudStats("LV 2 · LIVES 3")، props.onGameOver(finalScore) فقط یک‌بار
9. رنگ‌ها: props.game.accent / accent2 + پالت خودت (استایل نئون هماهنگ با تم تیره)
10. responsive: موبایل عمودی باید کامل قابل بازی باشد (canvas fit به عرض)
11. فقط همین یک فایل را بنویس/جایگزین کن. فایل دیگری را دست نزن. server/lint اجرا نکن (اینتگریشن با main agent).

---
Task ID: 3-d
Agent: general-purpose (PongGame)
Task: پیاده‌سازی کامل کارتریج PONG-72 — نوشتن src/components/games/PongGame.tsx (جایگزینی placeholder) طبق 🎮 GAME CONTRACT

Work Log:
- قراردادها خوانده شد: shared/types.ts (GameProps)، registry (pong: targetScore 5/7/11، ballSpeed، aiIQ، difficulty rookie/pro/legend، accent #c084fc/#4ade80)، chiptune SfxName، DPad
- زمین مجازی 1280×800 (نسبت 16:10) با letterbox داخل والد؛ ResizeObserver + devicePixelRatio (cap 2x)
- حلقه rAF با fixed timestep 120Hz + accumulator؛ کل state در useRef (بدون state React در مسیر فریم)؛ props.paused → فقط رندر، شبیه‌سازی فریز
- مکانیک توپ: زاویه برگشت از محل برخورد پارو (offset → تا 60°)، +4% سرعت در هر برخورد پارو با cap 2.2× سرعت پایه، سرعت پایه slow=260/normal=340/fast=430 نسبت به ارتفاع زمین، bounce دیواره بالا/پایین، rally counter + maxRally
- AI: پیش‌بینی Y رسیدن توپ با بازتاب دیواره‌ها (triangle-wave) + خطای هدف؛ dumb=تعقیب توپ با lag 0.30s و خطای بزرگ، normal=پیش‌بینی ملایم 0.14s، genius=پیش‌بینی کامل 0.06s با خطای کم؛ سقف سرعت AI؛ difficulty: rookie سرعت ×0.85/واکنش ×1.15، legend سرعت ×1.15/واکنش ×0.85/پیش‌بینی بهتر
- امتیازدهی: رد شدن توپ از پارو → امتیاز حریف؛ playSfx('hit') برای برخورد پارو و playSfx('coin') برای گل؛ سرو بعد از 1s به سمت بازیکنی که امتیاز داد (conceder)؛ پایان مسابقه با رسیدن هر طرف به targetScore → برد: playSfx('levelup')، باخت: بی‌صدا؛ props.onGameOver(finalScore) دقیقاً یک‌بار (guard با ref)
- مدل امتیاز: playerPoints×100 + maxRally×10 + (برد؟ +250)؛ HUD زنده: onScore(playerPoints×100 + rally×10) و onHudStats("YOU n — m CPU · RALLY r") فقط هنگام تغییر مقدار
- رندر نئون: خط‌چین وسط زمین، پاروهای glow (بازیکن #c084fc، AI #4ade80 با هسته سفید)، توپ مربع سفید/فیروزه‌ای glow با trail (نمونه‌برداری فاصله‌ای + fade)، اعداد بزرگ YOU/CPU با فونت monospace نیمه‌شفاف، flash/shake هنگام گل، MATCH POINT پالس‌دار، scanline متحرک + نوار shimmer، قاب glow دور زمین
- کنترل‌ها: ↑↓/W S با preventDefault + cleanup (هنگام pause یا فوکوس input حذف می‌شود تا تایپ initials خراب نشود)، pointer drag روی نیمه چپ canvas (setPointerCapture + clamp، نگاشت معکوس letterbox)، <DPad onDir> → گلید نرم 180ms، پاکسازی کامل listener/RO/rAF در unmount
- تروفی‌ها: unlockAchievement('pong_first') روی mount، 'pong_win_hard' در صورت برد مسابقه روی difficulty pro/legend
- بدون هیچ 'any'؛ موبایل عمودی: زمین scale می‌شود، drag حتی روی ناحیه letterbox چپ کار می‌کند (slack برای شست)

Stage Summary:
- PONG-72 کامل شد: فقط فایل src/components/games/PongGame.tsx نوشته/جایگزین شد (889 خط)؛ هیچ فایل دیگری تغییر نکرد و lint/dev server اجرا نشد (per contract #11)
- قرارداد GameProps + registry + achievements کاملاً رعایت شد؛ تست مرورگر و lint نهایی با main agent

---
Task ID: 3-a
Agent: general-purpose (SnakeGame)
Task: پیاده‌سازی کامل کارتریج SERPENT.EXE — جایگزینی placeholder در src/components/games/SnakeGame.tsx

Work Log:
- قراردادها خوانده شد: shared/types.ts (GameProps)، registry.ts (ورودی snake)، chiptune.ts (SfxName)، DPad.tsx، achievements.ts، GameShell.tsx
- SnakeGame.tsx کامل نوشته شد: "use client"، default export SnakeGame(props: GameProps)، TypeScript strict بدون any — ۸۱۷ خط
- Settings: speed slow/normal/fast/insane → tick 180/130/90/60ms؛ board 15/21/27؛ walls solid|wrap؛ goldenApple (هر سیب پنجم → سیب طلایی اضافه، ۶ ثانیه، +۳۰ امتیاز، چشمک‌زن، اتمام زمان = حذف)
- Difficulty: rookie ×1.15، arcade ×1.0، nightmare ×0.85 + مانع پس از ۵ سیب (max 8، پرهیز از محدوده spawn مرکزی و ۳ خانه جلوی سر؛ برخورد = مرگ)
- مکانیک: شروع طول ۳ به راست، صف جهت (عمق ۳، جلوگیری از چرخش ۱۸۰°)، Arrow/WASD با preventDefault و passive:false، سوایپ روی canvas (آستانه ۲۴px، سوایپ زنجیره‌ای)، DPad زیر canvas
- امتیاز/صدا: سیب +10 با playSfx('eat')؛ طلایی +30 با playSfx('coin')؛ مرگ فقط playSfx('hit') — صدای 'die' با شل است؛ onGameOver دقیقاً یک‌بار (گارد ref)
- HUD: onScore/onHudStats فقط در تغییر (`LEN n · APPLES n`)؛ تروفی‌ها: snake_first روی اولین mount، snake_apples_10/25، snake_nightmare (امتیاز ≥150 و nightmare)
- رندر: Canvas 2D با DPR و ResizeObserver، گرید مربعی letterbox (cell=floor(min(w,h)/grid))، بورد نیمه‌شفاف، خطوط شبکه و بورد با accent2 (بورد خط‌چین برای wrap)، مار = پلی‌لاین درخشان با shadowBlur + سر روشن‌تر با چشم جهت‌دار (چشم X روی مرگ)، سیب مرجانی با درخشش و برگ، سیب طلایی پالس‌دار، موانع اسلیتی با خطوط هشدار کهربایی؛ interpolation نرم بین tickها (snap روی پرش wrap)
- حلقه: rAF + accumulator + تایمر طلایی همگی در useRef؛ paused=true → بدون update، رندر ادامه دارد؛ cleanup کامل (raf، ResizeObserver، keydown، touch) در unmount
- تایید تایپ با tsc --noEmit (فقط خواندنی): صفر خطا در src/components/games/**؛ خطاهای از قبل موجود در examples/skills/terminal دست‌نخورده ماند

Stage Summary:
- کارتریج SERPENT.EXE کامل و type-clean است؛ مطابق قرارداد بازی‌ها (تک‌فایل، GameProps، حلقه مبتنی بر ref، شل مسئول pause/صدای مرگ/تروفی‌های امتیازی)
- تنها فایل نوشته‌شده: src/components/games/SnakeGame.tsx (+ همین append به worklog). هیچ فایل دیگری تغییر نکرد؛ lint/dev server اجرا نشد

---
Task ID: 3-c
Agent: general-purpose (TetrisGame)
Task: پیاده‌سازی کامل کارتریج BLOCKFALL (تتریس فضایی) در فایل src/components/games/TetrisGame.tsx — جایگزینی placeholder

Work Log:
- خواندن قرارداد بازی‌ها: types.ts (GameProps)، registry.ts (blockfall: ghost/startLevel/grid، difficulty casual|standard|brutal، accent #22d3ee/#b026ff)، chiptune.ts (SfxName)، DPad.tsx، GameShell.tsx
- هسته: رندر Canvas 2D با ResizeObserver + devicePixelRatio، حلقه rAF با fixed timestep accumulator (16ms، در useRef)، کل state در ref/closure — بدون React state
- مکانیک: بورد 10x20، ۷ تترامینو با رنگ نئون متمایز، 7-bag randomizer، چرخش با wall-kick پایه (0,-1,+1,-2,+2)، lock delay 400ms با reset روی حرکت (حداکثر 8 بار)، spawn بالای بورد و top-out → onGameOver یک‌بار (گارد ref)
- اسکورینگ: 100/300/500/800 × level، soft drop +1/سلول، hard drop +2/سلول + playSfx('drop')، level-up هر ۱۰ خط با playSfx('levelup')، گرانش max(60, 800×0.85^(level-1)) با ضریب difficulty (casual 1.4 / brutal 0.75)
- ورودی: کیبورد ←→ با DAS (170ms تأخیر / 40ms تکرار)، ↓ soft drop، Space hard drop، ↑/X و W CW، Z CCW، preventDefault + پاک‌سازی listener، blur → ریست کلیدهای نگه‌داشته
- لمسی: TouchActionButtons (⟲◀▶▼⤓) + DPad (بالا=چرخش) touch-only در پایین؛ swipe/drag روی canvas: پایین=soft drop، چپ/راست=حرکت، swipe سریع بالا=چرخش (touchmove non-passive + touch-action:none)
- رندر: بلاک‌ها با bevel داخلی + glow (shadowBlur روی پیز فعال/پیش‌نمایش)، ghost به‌صورت outline، فلش سفید 150ms قبل حذف خطوط، لرزش صفحه روی hard drop/تتریس، ستاره‌های پس‌زمینه مداری، قاب نئون با glow
- چیدمان: دسکتاپ (عرض≥620) بورد + پنل کنار (NEXT + LEVEL/LINES)، موبایل عمودی بورد fit به عرض + NEXT کوچک گوشه بالا-راست canvas + خوانده LV/lines کوچک
- HUD: onScore در هر تغییر، onHudStats با قالب «LV n · LINES n · NEXT X»، paused → skip update و رندر فریم آخر (از pausedRef زنده)
- تروفی‌ها: tetris_first روی mount، tetris_tetris روی ۴خط، tetris_level_5 وقتی level≥5
- فقط همین یک فایل نوشته/جایگزین شد؛ lint/dev server اجرا نشد (طبق قرارداد)

Stage Summary:
- BLOCKFALL آماده ادغام است: export default TetrisGame(props: GameProps) با قرارداد کامل shell (score/hud/gameover/paused/settings/difficulty)
- رندر و فیزیک سبک و 60fps-friendly (بلاک‌های ثابت بدون shadow، فقط پیز فعال glow دارد)
- نکته برای main agent: صداهای move/rotate/drop/hit/clearLine/levelup استفاده شده؛ پیز O چرخش بدون kick و DPad up هم playSfx('move') داخلی DPad + rotate می‌دهد (رفتار قابل قبول)
- افزودنی: اصلاح کوچک null-safety برای ctx در TetrisGame (alias non-null پس از گارد) — تایید tsc --noEmit فقط-خواندنی: صفر خطا در TetrisGame.tsx (خطاهای از قبل موجود در examples/skills/terminal دست‌نخورده ماند)
---
Task ID: 3-b
Agent: general-purpose (PacGame)
Task: Build MUNCHER-84 (simplified PAC-MAN cartridge) — overwrite src/components/games/PacGame.tsx.

Work Log:
- Read shared/types.ts (GameProps), muncher registry entry (settings: ghosts/powerTime/ghostSpeed/maze), DPad.tsx (onDir contract), verified unlockAchievement(id: string): boolean signature.
- Wrote full game in one pass: 19x21 handcrafted symmetric maze (walls/dots/power pellets/tunnel row wrap at row 10, no dead ends); tile-to-tile mover with buffered direction (Arrows/WASD w/ preventDefault, canvas swipe, DPad under canvas).
- Ghosts 2-4 with personalities (chase / 4-tiles-ahead ambush / random / mixed chase-scatter), non-reversing dir choice minimizing euclidean distance (maximizing when frightened); leave house staggered 2.5s per ghost, eaten ghosts teleport to house + 4s respawn, +200/400/800/1600 with 'hit' sfx.
- Settings honored: powerTime 4/6/9s, ghostSpeed 4.2/4.8/5.4 tiles/s, difficulty easy/normal/insane x0.9/1.0/1.15, maze 'random' = mirrored layout + safe carved loops (>=2 open neighbors).
- Lives 3 with 2s invincible blink + position reset; single onGameOver via ref guard; level clear = levelup sfx, maze reset, ghost speed +8%/level; fruit every 40 dots (+100, 8s); HUD via onScore/onHudStats; achievements muncher_first/muncher_ghosts_4/muncher_power.
- Rendering: DPR-aware canvas, ResizeObserver letterbox (tile=floor(min(w/19,h/21))), cached glowing rounded-stroke wall layer (#c084fc), pale square dots, pulsing pellets, gold animated-arc muncher (#fbbf24), dome+zigzag ghosts with directional eyes, deep-blue frightened; rAF + 1/120 fixed timestep, all state in useRef, full cleanup on unmount, strict TS zero `any`.

Stage Summary:
- PacGame.tsx complete (669 lines) and game-ready; no type-check or lint run per task time budget.
- Suggested next: run `tsc --noEmit` + smoke-test in GameShell (score/HUD/pause/game-over wiring), confirm sfx names match chiptune lib.

---
Task ID: 4 (integration)
Agent: Main Agent (Z.ai Code)
Task: یکپارچه‌سازی ۴ بازی، رفع باگ‌ها، تست کامل ریسپانسیو و تأیید نهایی مرورگر

Work Log:
- ۳ بازی از ساب‌ایجنت‌ها رسید: SnakeGame (817 خط)، TetrisGame (1050 خط)، PongGame (889 خط)؛ PacGame بعد از ۲ تایم‌اوت با اسپک فشرده‌تر ساخته شد (862 خط)
- رفع خطاهای lint/TS: حذف eslint-disable بلااستفاده، ref-update در render → useEffect (PacGame)، نوع‌دهی info command (commands.ts)
- باگ مهم: GameShell بدون remount هنگام تعویض کارتریج state را لو می‌داد → key={route.gameId} در page.tsx
- تشخیص لمسی قوی‌تر: کلاس js-touch روی documentElement + قاعده CSS. js-touch .touch-only (پوشش لپ‌تاپ لمسی)
- دو بار cache stale CSS در dev server → پاک‌سازی .next + ری‌استارت حل کرد
- تست مرورگر کامل: بوت ✅ ترمینال ✅ دستور run ✅ قفسه کارتریج ✅ snake playable ✅ muncher playable (مaze نئونی + ارواح + قرص قدرت) ✅ tetris (NEXT/ghost/grid) ✅ pong (راکت/توپ/HUD) ✅
- گیم‌آور ✅ NEW RECORD + ثبت امضای ۳ حرفی (ARK ردیف ۳ هایلایت شد) ✅ جدول Hall of Fame ✅
- تم PURE WHITE در تنظیمات/ترمینال/گیم‌آور ✅ — توست تروفی‌ها ✅
- موبایل 390x844: ترمینال/قفسه/HUD تمیز، D-Pad با لمس ظاهر می‌شود ✅
- lint: 0 error 0 warning | tsc src: 0 error | dev.log: بدون خطای runtime

Stage Summary:
- ARKIN-IV فاز ۱ تا ۶ کامل: کنسول CRT با ۴ تم، بوت، ترمینال ۱۶ دستوری + easter eggs، ۴ بازی کامل، تروفی‌ها، رکوردها، صدا، ریسپانسیو کامل
- آماده برای فاز ۷: GitHub + Cloudflare Workers (طبق ROADMAP.md)
