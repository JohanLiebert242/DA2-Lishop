# AI Analytics Insights (Admin) - Design

Date: 2026-06-06

## Goal

Add an "AI insights" panel to the existing Admin Analytics page so admins can get actionable, plain-language insights from current analytics data (revenue, top products, order status breakdown, low stock).

Success criteria:
- Runs on `/admin/analytics` with a simple "Generate/Refresh insights" interaction.
- Uses OpenAI when configured; otherwise returns a deterministic fallback (no hard dependency).
- Safe and testable: backend unit tests + Playwright e2e test pass.

Non-goals:
- Building a full BI system, cohort analysis, or long-term trend modeling.
- Storing insights historically (no new DB tables).
- Real-time streaming updates.

## Current State

Backend already provides:
- `GET /admin/analytics` (via AdminService/AdminRepository) with:
  - 30-day revenue series
  - summary KPIs
  - top products
  - order status breakdown
  - low stock products

Frontend already has:
- `mfe-admin` page `src/app/admin/analytics/page.tsx` rendering those charts/tables.

## UX

Placement:
- Add a new card/panel near the top of `/admin/analytics` (above charts), titled "AI insights".

Interaction:
- Button: "Tao insight" / "Lam moi"
- While loading: show "Dang phan tich..." state.

Output:
- Highlights (3-6 bullets)
- Risks (0-3 bullets)
- Actions (2-5 recommended actions, each with a short rationale)
- Optional questions (0-2) if data seems insufficient/ambiguous
- Badge if fallback was used

Test selectors:
- Root: `data-testid="admin-analytics-ai"`
- Button: `data-testid="admin-analytics-ai-run"`

## Backend Design

### Endpoint

- `POST /admin/analytics/ai-insights`

Auth:
- Admin-only (same auth model as other admin endpoints).

Request body:
```json
{ "rangeDays": 30 }
```

Response:
```json
{
  "highlights": ["..."],
  "risks": ["..."],
  "actions": [{ "title": "...", "rationale": "..." }],
  "questions": ["..."],
  "fallback": false
}
```

### Logic

Input data:
- Reuse `AdminRepository.getAnalytics()` output as the primary dataset.
- Derive a few extra computed features:
  - revenue trend last 7 vs previous 7 days
  - concentration of revenue in top product(s)
  - low-stock count and notable items

OpenAI path:
- If `OPENAI_API_KEY` is set:
  - Call Responses API (`/v1/responses`) with bounded tokens.
  - Instruct model to output strict JSON with keys: highlights, risks, actions, questions.
  - Validate/parse output:
    - If parse fails or schema invalid => fallback.

Fallback path:
- Deterministic rule-based insights, e.g.:
  - If 7d revenue down vs prior 7d => highlight + action (promo/ads).
  - If top1 revenue share high => risk + action (diversify).
  - If low stock products exist => risk + action (restock).
  - If many cancelled/refunded => risk + action (review fulfillment/payment).

Testing:
- Unit tests for:
  1) no API key => fallback true with non-empty highlights/actions
  2) API key set but OpenAI fails => fallback true
  3) API key set and OpenAI returns valid JSON => fallback false and fields present

## Frontend Design (mfe-admin)

- Extend `apps/mfe-admin/src/lib/admin-api.ts` with:
  - `getAiAnalyticsInsights(rangeDays?: number)`
  - types for the response
- Update `apps/mfe-admin/src/app/admin/analytics/page.tsx` to include the new "AI insights" panel:
  - Use React Query mutation to call the endpoint on button click
  - Render lists and actions
  - Use stable test IDs above

## Playwright E2E

- Add spec: `lishop-frontend/tests/e2e/admin-ai-analytics-insights.spec.ts`
- Route-stub:
  - `**/admin/analytics` (existing) can remain live or stub if needed
  - `**/admin/analytics/ai-insights` => fulfill predictable JSON
- Assert:
  - panel renders
  - clicking button shows returned insight text

