# AI Shopping Concierge Design

## Goal

Add a customer-facing AI Shopping Concierge that helps shoppers describe a need in natural language, receives product recommendations, and can review a suggested cart plan before choosing to add items to cart.

## Current Context

Lishop already has:

- AI product discovery via `POST /products/ai-discovery`.
- Personalized recommendations via `GET /products/recommendations`.
- Support chatbot via `POST /support/chat`.
- Authenticated cart APIs via `/cart/items`.
- Catalog `ChatWidget` rendered in the customer shopping experience.

## Scope

The Concierge will recommend products and build an add-to-cart plan. It will not place orders, apply payments, create checkout sessions, or buy on behalf of the customer.

The first implementation focuses on catalog shopping:

- Natural-language product advice.
- Product comparison/advice when relevant.
- Suggested cart plan containing in-stock products.
- Frontend confirmation before any cart mutation.

## Backend Design

Add a customer-facing endpoint:

```http
POST /shopping/concierge
```

Request:

```json
{ "message": "Toi can combo di lam duoi 1 trieu" }
```

Response:

```ts
{
  reply: string;
  items: ConciergeProduct[];
  cartPlan: ConciergeCartItem[];
  actions: ConciergeAction[];
  fallback: boolean;
}
```

`ConciergeProduct` contains product id, name, slug, price, stock, rating, short description, and primary image. `ConciergeCartItem` contains product id, name, slug, quantity, price, image, and reason. `ConciergeAction` supports `ADD_TO_CART`, `VIEW_PRODUCT`, and `ASK_CLARIFYING_QUESTION`.

Implementation unit:

- Create `ShoppingModule`.
- Create `ShoppingConciergeService`.
- Create `ShoppingController`.
- Reuse `ProductsService.findMany` to retrieve candidate products from catalog.
- Use OpenAI Responses API when `OPENAI_API_KEY` is configured.
- Fall back to deterministic rules when OpenAI is unavailable.

OpenAI behavior:

- Send customer message plus bounded product candidates.
- Ask for strict JSON only.
- Require cart plan items to use product ids from candidates.
- Do not suggest out-of-stock items for cart plan.
- If the request is ambiguous, ask a short clarifying question and return an empty or small cart plan.

Fallback behavior:

- Search products by the message.
- Keep in-stock items only for cart plan.
- Pick up to 4 products.
- Quantity defaults to `1`.
- Reply explains this is a suggested set the customer can review.

## Frontend Design

Upgrade `mfe-catalog` `ChatWidget` into the Concierge experience.

UI behavior:

- Quick replies become shopping-focused prompts.
- Bot product cards support product viewing.
- Cart plan appears with item reasons and total estimated value.
- Each suggested item has an add button.
- The plan has an `Add all` button.
- If adding fails due to auth, redirect to login or show the existing cart-helper behavior.

The frontend still calls existing `/cart/items` only after the customer clicks an add button.

## Error Handling

- Backend missing OpenAI key returns fallback.
- Backend OpenAI error returns fallback.
- Backend never includes out-of-stock products in `cartPlan`.
- Frontend shows a normal text error if the Concierge call fails.
- Frontend disables add buttons while mutations are pending.

## Testing

Backend unit tests cover:

- OpenAI success returns structured reply, products, cart plan, and actions.
- Missing OpenAI key returns fallback with non-empty cart plan when in-stock products exist.
- OpenAI failure returns fallback.
- Out-of-stock products are excluded from cart plan.

Frontend verification covers:

- Catalog type-check.
- Playwright e2e mocking `/shopping/concierge` and `/cart/items`, then asserting cart plan rendering and add action.

## Non-Goals

- No checkout automation.
- No payment automation.
- No persistent conversation memory.
- No product embeddings/vector search in this iteration.
- No automatic coupon application.
