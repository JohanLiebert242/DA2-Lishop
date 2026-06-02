# Demo Seed Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current demo seed with a clean, repeatable ecommerce dataset that covers all main backend modules.

**Architecture:** Keep seeding in the existing Prisma seed entrypoint, `packages/database/prisma/seed.ts`. The seed will clear all user-facing data, create deterministic demo accounts, then create related catalog, promotion, order, wallet, return, refund, notification, and support records.

**Tech Stack:** Prisma Client, TypeScript, bcrypt, existing PostgreSQL database.

---

### Task 1: Replace Seed Script

**Files:**
- Modify: `lishop-backend/packages/database/prisma/seed.ts`

- [ ] **Step 1: Replace old seed with deterministic full-demo seed**

Implement helpers for dates, slugs, money values, cleanup order, and relation creation. Use ASCII strings to avoid encoding issues.

- [ ] **Step 2: Run TypeScript/Prisma seed command**

Run: `corepack pnpm --filter @lishop/database db:seed`

Expected: command exits 0 and prints record counts.

- [ ] **Step 3: Verify database counts**

Run a Prisma count script for users, categories, products, variants, orders, reviews, notifications, wallets, invoices, refunds, support tickets, and FAQs.

Expected: counts match the balanced demo profile: 11 users, 18 categories, 50 products, 30 orders, and coverage for each main module.

- [ ] **Step 4: Commit**

Run:

```bash
git add docs/superpowers/plans/2026-06-02-demo-seed-data-plan.md lishop-backend/packages/database/prisma/seed.ts
git commit -m "feat: expand demo seed data"
```
