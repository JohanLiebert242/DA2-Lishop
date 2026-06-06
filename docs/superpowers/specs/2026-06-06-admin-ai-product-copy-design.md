# Admin AI Product Copy Design

## Goal

Add an admin-facing AI helper that drafts product descriptions from product form data, reducing manual writing work while keeping admin in control of the final copy.

## Scope

Phase 2 covers only admin product copy generation:

- Generate a Vietnamese product description from name, category, price, stock, SKU, and any rough description already typed.
- Insert the generated description into the product modal for review/editing.
- Provide deterministic fallback if `OPENAI_API_KEY` is missing or the model call fails.
- Unit tests, type checks, and Playwright e2e coverage.

This phase does not auto-publish generated content, enrich CSV imports, classify tickets, or moderate reviews.

## Backend Design

Add an admin-only endpoint:

- `POST /admin/products/ai-copy`
- Body:
  - `name: string`
  - `description?: string`
  - `categoryName?: string`
  - `priceVnd?: number`
  - `stock?: number`
  - `sku?: string`
- Response:
  - `description: string`
  - `fallback: boolean`

`AdminService.generateProductCopy(input)` will:

1. Build compact product context from the input.
2. If `OPENAI_API_KEY` is missing, return a deterministic Vietnamese fallback description.
3. If configured, call OpenAI Responses API with a prompt that asks for concise ecommerce copy.
4. If the model call fails or returns no text, log and return fallback.

The model prompt must not invent specs, discounts, warranties, or delivery promises.

## Frontend Design

In `ProductModal`, add a small "AI viet mo ta" button near the description field.

Behavior:

- Button is disabled until product name is present.
- Clicking sends the current form context to `/admin/products/ai-copy`.
- Loading text appears while generating.
- Generated copy replaces the description textarea, so admin can edit before saving.
- Fallback copy is accepted the same way; no modal or extra workflow is needed.

The UI stays compact and operational, matching the existing admin page style.

## Testing

Backend tests:

- With OpenAI key, calls Responses API and returns model text.
- Without key, does not call `fetch` and returns fallback text containing the product name.
- If OpenAI fails, returns fallback.

Frontend/type tests:

- `adminApi.generateProductCopy` has typed input and response.
- Admin MFE type-check passes.

Playwright e2e:

- Mock auth and admin data.
- Open `/admin/products`, click add product.
- Fill product name.
- Mock `POST /admin/products/ai-copy`.
- Click AI button and assert description textarea receives generated text.

## Rollout

The feature is safe without `OPENAI_API_KEY`; admins still get fallback copy and can edit before saving.
