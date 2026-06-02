# Catalog Product Detail Phase 1 Design

## Scope

Improve the catalog product listing and product detail experience:

- Add product filters for brand, price range, rating, stock, sale, and free shipping.
- Fix variant/SKU selection so users can choose attributes such as color and size independently.
- Show a size-guide link when size variants exist and scroll to the size guide section.
- Add share actions and like count below product images.
- Add shop information below product detail.
- Replace the simple description block with richer product description sections.
- Let customers filter reviews by star rating.
- Let customers attach image/video URLs or local previews in the review form for phase-1 media UX.

## Approach

Use existing catalog APIs and add lightweight query parameters for filters. For brand filtering, use demo-friendly derived brand matching from product names instead of adding a database migration in this phase. Sale filtering uses product tags that include `sale`; free shipping uses the current store rule of products priced from 500,000 VND.

Variant selection will be frontend-driven using existing `variant.attributes`. The detail page will group attributes such as `color`, `size`, `storage`, and `format`, then choose the variant matching all selected values. SKU, price, and stock will follow the selected variant.

Review media in this phase is UI-first: customers can attach image/video URLs and preview selected local files before submitting text. Persisting uploaded binary files requires storage and security work and belongs in a later upload phase.

## Verification

Verification should cover backend type-check/tests for product query filtering, catalog type-check, and Playwright checks for listing filters, SKU changes, size guide scrolling, rich description, shop info, share controls, and review star filtering/media UI.

