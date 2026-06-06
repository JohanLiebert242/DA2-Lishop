# AI Personalized Recommendations (Customer) - Design

Date: 2026-06-06

## Goal

Add an "AI recommendation ca nhan hoa" feature for shoppers (mfe-catalog) that shows a "Danh cho ban" section and returns recommended products based on available user signals.

Success criteria:
- Works for logged-in users (personalized) and guest users (non-personalized fallback).
- Stable and testable: backend unit tests + Playwright e2e pass reliably.
- Graceful degradation: if OpenAI is not configured or fails, still returns reasonable recommendations (fallback = true).

Non-goals:
- Building a full behavioral tracking / product view history system.
- Training or storing embeddings/vectors.
- Multi-language generation; the UI remains Vietnamese like existing features.

## Current Constraints / Available Signals

Backend currently has:
- Orders + OrderItems (purchase history).
- Wishlist items.
- Product/category/tag info for products.

Backend does NOT currently have:
- Per-session "view history" table.

Therefore personalization will be based primarily on:
1) wishlist categories/tags/products
2) recent purchased categories/tags/products
3) fallback to featured/popular if insufficient data

## Approach Options (Chosen)

Chosen approach: Hybrid heuristic + optional AI rerank/explanation.

Why:
- Heuristic gives deterministic candidates and keeps the system fast and reliable.
- AI adds extra value (rerank + short explanation) when configured.
- Same pattern is already used in existing AI features (OpenAI Responses API + fallback).

## User Experience

Where it appears (customer-facing):
1) Catalog home (`mfe-catalog /`): a "Danh cho ban" section.
2) Product list (`/products`): a "Danh cho ban" block near the top or in a right column, depending on current layout.

States:
- Loading: skeleton tiles.
- Loaded: product cards (same card component style as existing catalog list).
- Empty/insufficient signals: show featured/popular (still labeled as recommendations) and set fallback = true.
- Error: treat as fallback (do not show a scary error).

Test selectors:
- Section root: `data-testid="personalized-recs"`
- Each item: `data-testid="personalized-rec-item-${slug}"` (or id, depending on existing routing)

## Backend Design

### API Contract

Add a new public endpoint:
- `GET /products/recommendations?limit=<number>&context=<string>`

Auth behavior:
- Endpoint is Public, but should use user context if available.
- If request has `Authorization: Bearer ...` or `lishop_at` cookie, resolve userId; otherwise treat as guest.

Response shape:
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "string",
      "slug": "string",
      "description": "string",
      "priceVnd": 123,
      "stock": 10,
      "averageRating": 4.7,
      "reviewCount": 31,
      "brand": "string|null",
      "category": { "id": "uuid", "name": "string", "slug": "string" },
      "images": [{ "id": "uuid", "url": "string", "alt": "string|null", "isPrimary": true }]
    }
  ],
  "reason": "string",
  "fallback": true
}
```

Notes:
- `reason` is optional but recommended. It will be:
  - AI-generated short explanation when AI succeeds.
  - A short deterministic sentence when fallback occurs (e.g. "Goi y dua tren wishlist va don hang gan day." or "Goi y pho bien/featured.").
- `context` is a small hint string from frontend ("home" | "products") to allow minor ranking differences later; initially it may be ignored.

### Implementation Outline

Add in `ProductsService` (or a small companion service if needed):
- `recommendationsForUser(userId?: string, limit = 8, context?: string)`

Heuristic candidate generation:
1) If userId:
   - Fetch wishlist product ids; map to categories/tags.
   - Fetch recent order items (e.g. last 5 orders) and map to categories/tags/products.
   - Build candidate set:
     - related-by-category/tag to these products
     - exclude out-of-stock
     - dedupe by product id
2) If guest or not enough candidates:
   - use featured products (existing `findFeatured`) and/or a simple "popular" proxy (rating/reviewCount/createdAt) if repo supports it.

AI rerank/explanation (optional):
- If `OPENAI_API_KEY` exists:
  - Build a small prompt:
    - system/instructions: "Ban la AI goi y san pham ca nhan hoa cua Lishop..."
    - input: user signals summary (top categories/tags, wishlist count, recent purchases)
    - candidates JSON: max 12 items
    - ask for: select top N slugs (strictly from candidates) + short reason (1-2 sentences)
  - Parse response:
    - If parsing fails or missing slugs, fallback to heuristic order and fallback=true.
- Safety:
  - Do not hallucinate products; only allow output from candidate slugs.
  - Keep tokens bounded; cap candidate list and max_output_tokens.

Error handling:
- Any fetch/OpenAI error => return fallback heuristic response with `fallback: true`.

Testing (backend):
- Unit tests for recommendation function:
  - no api key => fallback true, returns deterministic items
  - api key present but OpenAI fails => fallback true
  - api key present and OpenAI returns valid => fallback false, reason exists

## Frontend Design (mfe-catalog)

Add a reusable component:
- `PersonalizedRecommendations` (client component)

Data fetching:
- Use existing frontend fetch/util patterns (React Query if already used in mfe-catalog; otherwise local fetch with caching).
- Call `GET /products/recommendations?limit=8&context=home|products`

Rendering:
- Header "Danh cho ban" + optional reason text (small, muted).
- Grid of product cards (reuse existing card UI).
- Ensure stable layout dimensions so skeleton/loading does not shift.

## E2E Design (Playwright)

Add an e2e spec in `lishop-frontend/tests/e2e`:
- Stubs the recommendation endpoint response
- Navigates to `mfe-catalog` home and/or `/products`
- Asserts `data-testid="personalized-recs"` exists and shows stubbed items

Flake avoidance:
- Do not intercept document navigation; if using `page.route`, call `route.fallback()` for `resourceType() === 'document'`.
- Use stable selectors (data-testid), not text-only selectors.

## Rollout / Config

Env vars already used in repo:
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional)

Default model:
- Match existing backend defaults (currently gpt-5.2 in ProductsService).

## Open Questions (Explicitly Decided)

- Placement: implement on `/` and `/products` as default "reasonable" locations.
- Personalization signals: wishlist + orders only (no view history in scope).

