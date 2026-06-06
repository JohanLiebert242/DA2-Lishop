# AI Analytics Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin AI insights panel that turns existing analytics data into actionable highlights, risks, actions, and questions.

**Architecture:** Backend adds `POST /admin/analytics/ai-insights`, reusing `AdminRepository.getAnalytics()` as the source dataset. The service calls OpenAI Responses API when configured and falls back to deterministic rule-based insights otherwise. Frontend adds a React Query mutation on `/admin/analytics` and renders a compact insights panel above the charts.

**Tech Stack:** NestJS, Jest, OpenAI Responses API through `fetch`, Next.js admin MFE, TanStack Query, Playwright.

---

## File Structure

- `lishop-backend/apps/api/src/modules/admin/admin.service.spec.ts`: unit tests for AI analytics insights.
- `lishop-backend/apps/api/src/modules/admin/admin.service.ts`: insight generation, prompt, parser, fallback rules.
- `lishop-backend/apps/api/src/modules/admin/admin.controller.ts`: `POST /admin/analytics/ai-insights` route.
- `lishop-frontend/apps/mfe-admin/src/lib/admin-api.ts`: response types and `getAiAnalyticsInsights`.
- `lishop-frontend/apps/mfe-admin/src/app/admin/analytics/page.tsx`: AI insights panel and mutation.
- `lishop-frontend/tests/e2e/admin-ai-analytics-insights.spec.ts`: Playwright coverage for the panel.

### Task 1: Backend AI Analytics Insights API

**Files:**
- Modify: `lishop-backend/apps/api/src/modules/admin/admin.service.spec.ts`
- Modify: `lishop-backend/apps/api/src/modules/admin/admin.service.ts`
- Modify: `lishop-backend/apps/api/src/modules/admin/admin.controller.ts`

- [ ] **Step 1: Write failing service tests**

Add tests for `generateAnalyticsInsights({ rangeDays: 30 })`:

```ts
it('generateAnalyticsInsights returns fallback insights when OpenAI key is missing', async () => {
  repo.getAnalytics.mockResolvedValue(mockAnalytics);
  const result = await service.generateAnalyticsInsights({ rangeDays: 30 });
  expect(global.fetch).not.toHaveBeenCalled();
  expect(result.fallback).toBe(true);
  expect(result.highlights.length).toBeGreaterThan(0);
  expect(result.actions.length).toBeGreaterThan(0);
});
```

Also add OpenAI success and OpenAI failure tests using the existing `global.fetch` mock pattern in the file.

- [ ] **Step 2: Run test to verify RED**

Run: `corepack pnpm --filter @lishop/api test -- admin.service.spec.ts`

Expected: fail because `generateAnalyticsInsights` does not exist.

- [ ] **Step 3: Implement backend method and route**

Add:

```ts
export interface AiAnalyticsAction {
  title: string;
  rationale: string;
}

export interface AiAnalyticsInsights {
  highlights: string[];
  risks: string[];
  actions: AiAnalyticsAction[];
  questions: string[];
  fallback: boolean;
}
```

Implement `AdminService.generateAnalyticsInsights({ rangeDays }: { rangeDays?: number })`, OpenAI JSON parsing, fallback insight generation, and route:

```ts
@Post('analytics/ai-insights')
@HttpCode(HttpStatus.OK)
generateAnalyticsInsights(@Body('rangeDays') rangeDays?: number) {
  return this.adminService.generateAnalyticsInsights({ rangeDays });
}
```

- [ ] **Step 4: Run backend focused verification**

Run:

```powershell
corepack pnpm --filter @lishop/api test -- admin.service.spec.ts
corepack pnpm --filter @lishop/api type-check
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit backend API**

```powershell
git add -- lishop-backend/apps/api/src/modules/admin/admin.service.spec.ts lishop-backend/apps/api/src/modules/admin/admin.service.ts lishop-backend/apps/api/src/modules/admin/admin.controller.ts
git commit -m "feat: add AI analytics insights API"
```

### Task 2: Admin Analytics Insights UI

**Files:**
- Modify: `lishop-frontend/apps/mfe-admin/src/lib/admin-api.ts`
- Modify: `lishop-frontend/apps/mfe-admin/src/app/admin/analytics/page.tsx`

- [ ] **Step 1: Add frontend API contract**

Add `AiAnalyticsInsightsResponse`, `AiAnalyticsAction`, and:

```ts
getAiAnalyticsInsights: (rangeDays = 30) =>
  apiFetch<AiAnalyticsInsightsResponse>('/admin/analytics/ai-insights', {
    method: 'POST',
    body: JSON.stringify({ rangeDays }),
  }),
```

- [ ] **Step 2: Add insights panel**

Add a panel near the top of `/admin/analytics` with:

- `data-testid="admin-analytics-ai"`
- Button `data-testid="admin-analytics-ai-run"`
- Loading text `Dang phan tich...`
- Rendered highlights, risks, actions, questions, and fallback badge.

- [ ] **Step 3: Run frontend type-check**

Run: `corepack pnpm --filter @lishop/mfe-admin type-check`

Expected: command exits 0.

- [ ] **Step 4: Commit admin UI**

```powershell
git add -- lishop-frontend/apps/mfe-admin/src/lib/admin-api.ts lishop-frontend/apps/mfe-admin/src/app/admin/analytics/page.tsx
git commit -m "feat: add admin AI analytics insights UI"
```

### Task 3: Playwright E2E Coverage

**Files:**
- Create: `lishop-frontend/tests/e2e/admin-ai-analytics-insights.spec.ts`

- [ ] **Step 1: Write e2e test**

Mock admin auth, stats, `GET /admin/analytics`, and `POST /admin/analytics/ai-insights`. Navigate to `/admin/analytics`, click the AI button, and assert the returned insight text appears.

- [ ] **Step 2: Run Playwright spec**

Run:

```powershell
$out = "test-results-analytics-ai-$(Get-Date -Format 'yyyyMMdd-HHmmss')"; corepack pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/admin-ai-analytics-insights.spec.ts --output=$out
```

Expected: 1 test passes.

- [ ] **Step 3: Commit e2e test**

```powershell
git add -- lishop-frontend/tests/e2e/admin-ai-analytics-insights.spec.ts
git commit -m "test: cover admin AI analytics insights"
```

### Task 4: Final Verification

**Files:**
- No source edits expected.

- [ ] **Step 1: Run backend full tests**

Run: `corepack pnpm --filter @lishop/api test`

Expected: all Jest suites pass.

- [ ] **Step 2: Run type-checks**

Run:

```powershell
corepack pnpm --filter @lishop/api type-check
corepack pnpm --filter @lishop/mfe-admin type-check
```

Expected: both commands exit 0.

- [ ] **Step 3: Run Playwright e2e**

Run the analytics AI Playwright command from Task 3 again.

Expected: 1 test passes.

- [ ] **Step 4: Inspect git status**

Run: `git status --short`

Expected: only unrelated runtime artifacts remain uncommitted.
