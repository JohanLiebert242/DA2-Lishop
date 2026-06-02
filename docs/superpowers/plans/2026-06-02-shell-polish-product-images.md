# Shell Polish And Product Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix flash sale countdown behavior, improve shell account UI/logo/brands/news, and make seeded product images more relevant.

**Architecture:** Keep UI changes inside shell components/pages and demo content inside the database seed script. Use stable local editorial news data instead of live crawling to avoid demo breakage.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, Nest/Prisma seed data, pnpm via Corepack.

---

### Task 1: Header, Logo, Avatar Dropdown, Countdown

**Files:**
- Move: `LiShop-Logo.png` to `lishop-frontend/apps/shell/public/lishop-logo.png`
- Modify: `lishop-frontend/apps/shell/src/components/header.tsx`
- Modify: `lishop-frontend/apps/shell/src/components/footer.tsx`
- Modify: `lishop-frontend/apps/shell/src/app/page.tsx`

- [ ] Make countdown update every second with React state and interval cleanup.
- [ ] Use the logo image in header and footer.
- [ ] Replace authenticated header actions with avatar dropdown.
- [ ] Run shell type-check.
- [ ] Commit.

### Task 2: Brand Banner And Rich News

**Files:**
- Modify: `lishop-frontend/apps/shell/src/app/page.tsx`
- Modify: `lishop-frontend/apps/shell/src/lib/news.ts`
- Modify: `lishop-frontend/apps/shell/src/app/news/page.tsx`

- [ ] Add brand banner below hero.
- [ ] Add image, read time, and full content to news items.
- [ ] Render richer image-backed news page.
- [ ] Run shell type-check.
- [ ] Commit.

### Task 3: Product Seed Images

**Files:**
- Modify: `lishop-backend/packages/database/prisma/seed.ts`

- [ ] Replace random product gallery URLs with category-relevant image pool URLs.
- [ ] Ensure every product creates at least four product images by cycling the pool.
- [ ] Keep URLs unique enough for the existing image uniqueness checks.
- [ ] Run a seed/image validation command.
- [ ] Commit.

### Task 4: Runtime Verification

**Files:**
- No intentional source edits unless fixes are needed.

- [ ] Verify shell type-check and backend focused seed/image checks.
- [ ] Use Playwright to confirm countdown changes, logo/avatar UI, brand banner, news page, and image rendering.
- [ ] Commit any source fixes required by verification.

