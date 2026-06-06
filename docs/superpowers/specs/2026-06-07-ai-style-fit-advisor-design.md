# AI Style/Fit Advisor Design

## Goal

Add an AI Style/Fit Advisor to the catalog product detail page so shoppers can get size and styling guidance before adding a product to cart. The first version focuses on fit selection for a single product using existing product, variant, and attribute data.

## User Experience

On a product detail page, shoppers can open an advisor panel near the variant/size controls. They enter height, weight, preferred fit, optional body shape, occasion, and notes. The advisor returns:

- a recommended size or variant when the product has size variants,
- a confidence level,
- a short fit summary,
- reasons for the recommendation,
- styling tips for the occasion,
- warnings such as "size up for relaxed fit" or "stock is unavailable".

If a recommended variant is returned, the UI provides a "choose this size" action that selects the matching product variant in the existing variant picker.

## Backend Design

Add a public endpoint in the existing shopping module:

`POST /shopping/style-fit-advisor`

Request body:

- `productId: string`
- `heightCm: number`
- `weightKg: number`
- `preferredFit: "slim" | "regular" | "relaxed" | "oversized"`
- `bodyShape?: string`
- `occasion?: string`
- `notes?: string`

Response body:

- `recommendedVariantId?: string`
- `recommendedSize?: string`
- `confidence: "low" | "medium" | "high"`
- `fitSummary: string`
- `reasons: string[]`
- `styleTips: string[]`
- `warnings: string[]`
- `fallback: boolean`

The service loads the product by `productId` with its category, images, and variants. The OpenAI prompt is grounded in that product context and may only recommend variants that belong to the current product. If OpenAI returns an unknown variant, invalid JSON, no API key exists, or the request fails, the service returns a deterministic fallback.

The fallback should use the existing variant attributes. It prefers in-stock variants with a `size`/`Size` attribute, uses a simple height and weight heuristic to pick S/M/L/XL-like sizes when available, then adjusts one step up for `relaxed` or `oversized` preferences. If no size variants exist, it returns general fit guidance with low confidence.

## Frontend Design

Update the catalog product detail client with a compact advisor panel near the size/variant selection area. The panel should:

- collect height, weight, preferred fit, occasion, and optional notes,
- call `catalogApi.styleFitAdvisor`,
- show loading, error, and result states,
- show confidence, recommended size, reasons, style tips, and warnings,
- expose a "choose this size" button when `recommendedVariantId` matches an available variant,
- keep the existing add-to-cart behavior unchanged.

The UI should reuse existing product detail state instead of duplicating variant selection logic. Selecting a recommendation should call the same state path as clicking the variant option manually.

## Data And Safety Constraints

The advisor does not claim medical or body-measurement precision. It gives shopping guidance based on product data and user-provided fit preferences. It should not invent unavailable sizes, brands, or product properties. It must degrade gracefully without OpenAI.

## Testing

Backend unit tests:

- uses OpenAI with grounded product and variant context,
- returns fallback advice when OpenAI key is missing,
- ignores unknown AI variant IDs and falls back to a valid product variant,
- handles products without size variants.

Frontend e2e:

- opens a product detail page with size variants,
- submits shopper measurements,
- mocks the advisor API response,
- displays the recommendation,
- clicks "choose this size",
- verifies the matching size/variant is selected.

Verification commands:

- `corepack pnpm --filter @lishop/api test -- shopping-style-fit-advisor.service.spec.ts`
- `corepack pnpm --filter @lishop/api type-check`
- `corepack pnpm --filter @lishop/mfe-catalog type-check`
- `corepack pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/catalog-style-fit-advisor.spec.ts`
