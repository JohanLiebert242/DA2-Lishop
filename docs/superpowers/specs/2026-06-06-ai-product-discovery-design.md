# AI Product Discovery Design

## Goal

Add an AI-assisted product discovery flow for the catalog so customers can describe needs in natural Vietnamese, receive a short recommendation, and see relevant product cards from the existing catalog.

## Scope

Phase 1 covers catalog-facing product discovery only:

- Natural-language product advice from the catalog page.
- Product comparison when the customer asks to compare products.
- Backend context grounding using existing product data.
- Graceful fallback when `OPENAI_API_KEY` is not configured or the model call fails.
- Unit tests, type checks, and Playwright e2e coverage.

Admin AI, ticket summarization, review moderation, and personalization remain later phases.

## Backend Design

Add a product discovery endpoint under `ProductsController`:

- `POST /products/ai-discovery`
- Body: `{ message: string }`
- Public endpoint.

`ProductsService` will gain `discoverWithAi(message: string)`.

The service will:

1. Search existing products with `repo.findMany({ q: message, limit: 6 })`.
2. If `OPENAI_API_KEY` is missing, return a fallback response with the found products and an explanation that AI is not configured.
3. If `OPENAI_API_KEY` exists, send the customer message plus compact product context to OpenAI Responses API.
4. Return:
   - `reply`: model or fallback answer.
   - `mode`: `advice` or `compare`.
   - `items`: product summaries safe for the frontend.
   - `fallback`: boolean.

The model prompt must prohibit invented price, inventory, rating, product names, and promotions. It should ask a clarifying question if product context is weak.

## Frontend Design

Add an unframed AI discovery panel near the top of the catalog product list area. It should feel like a shopping assistant embedded in a work-focused commerce page, not a landing-page hero.

The panel includes:

- A compact textarea for natural-language needs.
- A submit button.
- Loading, error, and result states.
- The AI reply.
- Product chips/cards linking to product pages.

The existing filters remain unchanged. AI discovery is additive and does not replace normal search/filtering.

## Error Handling

- Empty message: frontend blocks submit; backend validates by returning a short fallback-style reply.
- Missing key: backend returns `fallback: true` and normal product search results.
- OpenAI error: backend logs the error and returns fallback search results.
- No products: backend returns no items and the AI/fallback reply asks for more detail or suggests changing constraints.

## Testing

Backend tests:

- OpenAI configured: calls Responses API with grounded product context and returns model reply.
- No OpenAI key: does not call fetch and returns fallback with products.
- OpenAI failure: returns fallback without throwing.
- Comparison intent: returns `mode: compare`.

Frontend tests:

- Catalog API wrapper posts to `/products/ai-discovery`.
- Component state renders reply and product cards.

Playwright e2e:

- Catalog page displays AI discovery controls.
- Route `POST /products/ai-discovery` is mocked.
- User enters a natural-language request and sees the AI reply plus suggested product.

## Rollout

The feature is safe to ship without `OPENAI_API_KEY`; it will use deterministic fallback behavior until the key is provided.
