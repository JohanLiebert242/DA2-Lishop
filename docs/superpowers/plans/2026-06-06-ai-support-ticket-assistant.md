# AI Support Ticket Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin AI assistant that summarizes support tickets and drafts replies.

**Architecture:** The existing admin controller exposes `POST /admin/tickets/:id/ai-assist`. `SupportTicketsService` loads ticket context, calls OpenAI when configured, and falls back deterministically; the admin ticket row renders the suggestion and uses the draft in the existing reply textarea.

**Tech Stack:** NestJS, TypeScript, Next.js, React Query, Playwright, OpenAI Responses API via `fetch`.

---

### Task 1: Backend Ticket Assist API

**Files:**
- Modify: `lishop-backend/apps/api/src/modules/support/support-tickets.service.spec.ts`
- Modify: `lishop-backend/apps/api/src/modules/support/support-tickets.service.ts`
- Modify: `lishop-backend/apps/api/src/modules/admin/admin.controller.ts`

- [ ] **Step 1: Write failing tests**

Add tests for OpenAI success, no-key fallback, OpenAI failure fallback, and missing ticket.

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm --filter @lishop/api test -- support-tickets.service.spec.ts`

Expected: failure because `generateAdminAssist` does not exist.

- [ ] **Step 3: Implement service and route**

Add structured response types, OpenAI call, JSON parsing, fallback builder, and admin controller endpoint.

- [ ] **Step 4: Verify GREEN**

Run:
- `corepack pnpm --filter @lishop/api test -- support-tickets.service.spec.ts`
- `corepack pnpm --filter @lishop/api type-check`

- [ ] **Step 5: Commit**

Run: `git add ... && git commit -m "feat: add AI support ticket assistant API"`

### Task 2: Admin Ticket UI

**Files:**
- Modify: `lishop-frontend/apps/mfe-admin/src/lib/admin-api.ts`
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/tickets/page.tsx`

- [ ] **Step 1: Add API client method**

Add `generateTicketAssist(ticketId)` and response type.

- [ ] **Step 2: Add UI behavior**

Add `AI goi y` button to expanded reply row, render summary/status/category suggestion, and populate `replyText`.

- [ ] **Step 3: Verify type-check**

Run: `corepack pnpm --filter @lishop/mfe-admin type-check`

- [ ] **Step 4: Commit**

Run: `git add ... && git commit -m "feat: add admin ticket AI assist UI"`

### Task 3: E2E and Final Verification

**Files:**
- Create: `lishop-frontend/tests/e2e/admin-ticket-ai-assist.spec.ts`

- [ ] **Step 1: Add Playwright test**

Mock auth, stats, tickets, and AI assist endpoint. Assert the draft fills the reply textarea.

- [ ] **Step 2: Run Playwright**

Run with a unique output folder: `corepack pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/admin-ticket-ai-assist.spec.ts --output=<unique>`

- [ ] **Step 3: Run final verification**

Run:
- `corepack pnpm --filter @lishop/api test`
- `corepack pnpm --filter @lishop/api type-check`
- `corepack pnpm --filter @lishop/mfe-admin type-check`
- Playwright command above

- [ ] **Step 4: Commit**

Run: `git add ... && git commit -m "test: cover admin ticket AI assist"`
