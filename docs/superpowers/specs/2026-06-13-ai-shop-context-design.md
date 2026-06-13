# AI Shop Context Design

## Goal

Make the Shell AI Assistant answer using live shop data from the current Lishop catalog instead of only generic support knowledge. The assistant should understand the current browsing context, prioritize products from the current shop or product page, and present answers with richer product cards that include images and clickable links.

## Current State

- The Shell widget sends `POST /support/chat` with only `{ message }`.
- The backend chatbot already reads:
  - matching products from the catalog,
  - FAQ entries,
  - authenticated user orders.
- The backend has no real `Shop` or `Seller` model in Prisma.
- The catalog storefront at `shops/[slug]` is currently derived from `brand` and product data, not from a dedicated shop table.
- The chatbot response already includes product image fields, but the Shell widget only renders text links.

## Chosen Approach

Use context-aware chat with catalog fallback.

- When the user opens AI from a shop page, the frontend sends shop context derived from that page.
- When the user opens AI from a product page, the frontend sends product and brand context derived from that page.
- The backend uses that context to prioritize relevant catalog products first.
- If the scoped search produces weak or empty results, the backend falls back to the broader catalog search.
- The frontend renders richer suggestion cards with image, title, price, and direct product link.

This approach fits the current codebase because it reuses existing product and brand data without introducing a fake `Shop` schema.

## Scope

### In scope

- Extend Shell AI request payload to carry optional chat context.
- Extend backend support chat DTO and service to consume optional context.
- Add shop-aware and product-aware product retrieval logic.
- Return richer product suggestions with image and link-ready data.
- Render product suggestion cards with preview image in the Shell chat widget.
- Add tests for backend behavior and frontend/e2e rendering.

### Out of scope

- Creating a new Prisma `Shop` or `Seller` model.
- Building a vector database or RAG pipeline.
- Giving the model internet browsing.
- Rendering arbitrary inline images inside the assistant text body.
- Changing the existing FAQ/ticket support flows beyond what chat needs.

## Request and Response Design

### Request

Extend `POST /support/chat` body from:

- `message`

To:

- `message`
- `context?`
  - `shopSlug?`
  - `productSlug?`
  - `brand?`
  - `pageType?` with values like `shop`, `product`, `support`, `other`

The frontend should only send fields it actually knows. Missing context must remain valid.

### Response

Keep the current response contract shape:

- `reply`
- `type`
- `data`

But ensure product suggestions include:

- `id`
- `name`
- `slug`
- `priceVnd`
- `brand`
- `primaryImage`
- `imageUrl`

No separate response type is required for this iteration. Existing `products` is enough.

## Frontend Design

### Context collection

The Shell widget currently lives outside catalog pages, so it needs page-derived context from the host app.

Implementation direction:

- Detect current URL from the browser in the Shell widget.
- If the current URL matches a product route, derive `productSlug`.
- If the current URL matches a shop route, derive `shopSlug`.
- When available, include `brand` if the page already exposes it or if it can be derived from the route logic already used by catalog.
- Send this context together with the user message.

This keeps the widget generic and avoids hard-coding specific product data in the Shell app.

### Product card rendering

Update the assistant message UI so product suggestions render as compact cards with:

- left thumbnail image,
- product name,
- brand if present,
- formatted price,
- clickable link to product detail.

If an image is missing, render a neutral placeholder block without breaking layout.

The card remains a direct link to the product page in the catalog app.

## Backend Design

### DTO and controller

Extend the support chat DTO to accept optional context fields.

The controller continues to call the same chatbot service, but now passes:

- authenticated `userId` if present,
- optional page context from the request body.

### Chatbot context building

Expand `ChatbotReplyContext` and `AiContext` so product retrieval can use:

- explicit product slug,
- explicit brand,
- shop slug translated into brand-derived scope when possible.

### Product retrieval strategy

For product-related prompts:

1. Build a scoped search query from context.
2. Try context-first product retrieval:
   - `productSlug` exact match first if present,
   - otherwise `brand` filter if present,
   - otherwise brand derived from `shopSlug` if the slug maps to a storefront brand,
   - otherwise no scope.
3. If scoped results are empty or too weak, run the current broad message search.
4. Merge, deduplicate, and cap results to the existing limit.

### Prompting behavior

The system prompt should explicitly tell the model:

- prioritize products from the current page context when available,
- say when recommendations are based on the current shop or product,
- avoid inventing unavailable shop metadata,
- use only supplied internal catalog and order data.

No model change is required.

## Shop Context Mapping

Because there is no real shop table, shop context is interpreted as a storefront view over product brands.

Rules:

- `lishop-official-store` means no brand filter; it represents the broad official storefront.
- Known brand-style shop slugs should map to the same brand naming logic already used in `apps/mfe-catalog/src/app/shops/[slug]/page.tsx`.
- Unknown shop slugs should degrade gracefully:
  - do not fail the request,
  - simply skip strict scoping and use broader catalog search.

To avoid logic drift, the slug-to-brand mapping should be extracted into a shared helper or reimplemented once on the backend with matching behavior and test coverage.

## Error Handling

- Missing or malformed context must never break chat; the request falls back to current behavior.
- If context points to a product or shop that no longer exists, the assistant should still answer using broader catalog data.
- If product images are missing, the UI still renders the card without the image.
- If OpenAI fails, the rule-based fallback should still use scoped product retrieval where practical.

## Testing Strategy

### Backend unit tests

Add tests for:

- request context being accepted without breaking old callers,
- product prompts using `brand` scope first,
- `productSlug` exact-match priority,
- fallback to broad catalog search when scoped results are empty,
- product suggestions preserving image fields.

### Frontend component tests or e2e coverage

Cover:

- the widget sending context fields when opened from relevant routes,
- product suggestions rendering image + link + price,
- graceful rendering when no image is present.

### Playwright e2e

Update or add e2e coverage to verify:

- AI chat can render richer product cards,
- product cards navigate to the expected product URL,
- existing text-only support flow still works.

## Risks and Mitigations

### Risk: duplicated slug-to-brand logic across apps

Mitigation:

- centralize the mapping helper in shared code if practical for both frontend and backend,
- otherwise add explicit tests to keep behavior aligned.

### Risk: Shell app may not naturally know current catalog context

Mitigation:

- derive context from the active route first,
- if route context is unavailable, send no context and preserve current behavior.

### Risk: AI answers may sound overconfident about “shop” details

Mitigation:

- keep prompt wording strict,
- only expose concrete catalog data that actually exists,
- avoid inventing ratings, policies, or seller metadata not present in the system.

## Implementation Outline

1. Add failing backend tests for chat context behavior.
2. Extend support chat DTO, controller, and chatbot context handling.
3. Add scoped product retrieval and fallback merge logic.
4. Add failing frontend/e2e coverage for rich product cards and context forwarding.
5. Update the Shell widget request payload and rendering.
6. Run unit tests and Playwright e2e until green.

## Success Criteria

- The Shell AI Assistant can answer with data grounded in the current shop/product context when available.
- The assistant still works outside catalog context.
- Product suggestions include image and direct link in the UI.
- Existing support/chat behavior remains backward compatible.
- Relevant backend tests and Playwright e2e tests pass.
