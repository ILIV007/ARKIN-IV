# ARKIN IV — Shared Worklog

---
Task ID: 1
Agent: Main Agent (Z.ai Code)
Task: تحقیق، تحلیل معماری و نگارش رودمپ کامل برای سایت آرکید ترمینالی ARKIN IV

Work Log:
- بررسی ساختار پروژه Next.js 16 موجود (شادcn/ui کامل، Prisma آماده)
- تحقیق وب: دیپلوی Next.js روی Cloudflare Workers از طریق @opennextjs/cloudflare + Workers Builds Git integration
- تحقیق وب: افکت‌های CRT/ترمینال با CSS خالص (scanlines, flicker, glow, vignette) و فونت‌های پیکسلی (Press Start 2P, VT323)
- تحلیل معماری: تصمیم «کارتریج مجازی» — کل تجربه در route واحد `/` با hash-routing (`/#/games/snake`) به دلایل: سازگاری با سندباکس، دیپلوی ساده Workers، حس واقعی کنسول
- تصمیم: بازی‌ها Canvas 2D + fixed timestep، State با Zustand + localStorage (بدون دیتابیس در فاز ۱)، صدا با Web Audio API، i18n دیکشنری ساده
- نگارش ROADMAP.md کامل شامل: ویژن، یافته‌های تحقیق، ۸ تصمیم معماری، ساختار فایل‌ها، مشخصات ۴ بازی (SERPENT.EXE snake، MUNCHER-84 pac-man، BLOCKFALL tetris، PONG-72 pong)، ۸ فاز اجرا، برنامه دیپلوی GitHub+Cloudflare، ریسک‌ها، ۵ سوال تاییدی

Stage Summary:
- سند نهایی: /home/z/my-project/ROADMAP.md (نسخه 1.0)
- منتظر تایید کاربر قبل از شروع فاز ۱ (هسته کنسول: CRT + Boot + Terminal engine)
- هیچ کدی هنوز نوشته نشده است
