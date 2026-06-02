# Product Variants Design

**Goal:** Add product variants to Lishop so selectable product options such as color, size, storage, RAM, and configuration can carry their own SKU, price, stock, weight, and display image while preserving existing products that do not need variants.

**Context:** Lishop currently stores price, stock, SKU, and weight directly on `Product`. `CartItem` and `OrderItem` reference only `productId`, so the cart cannot distinguish two selected versions of the same product. The feature must support micro-frontend catalog, cart, checkout, orders, and admin flows without breaking existing seed data or product pages.

## Scope

This phase adds variant support for customer shopping flows and enough admin/API surface for products to be created or seeded with variants.

Included:
- A `ProductVariant` database model related to `Product`.
- Product API responses include active variants.
- Product create/update DTOs can accept variants.
- Product detail UI lets customers choose a variant before adding to cart.
- Cart items can reference an optional `variantId`.
- Cart totals, stock validation, display labels, and images use variant values when present.
- Orders snapshot variant details at purchase time.
- Seed data includes representative variants for phones, laptops, apparel, and shoes.
- Tests cover product response, cart behavior, and order snapshot behavior.

Not included in this phase:
- A full variant matrix editor in admin.
- Bulk generate variants.
- Warehouse-level inventory.
- Uploading variant images.
- Import/export variants by Excel or CSV.

Those follow in later requested phases: admin upload/import, payment gateway, realtime notifications, analytics, and E2E flows.

## Data Model

Add `ProductVariant`:
- `id String @id @default(uuid())`
- `productId String`
- `sku String @unique`
- `name String`
- `priceVnd Int`
- `priceUsd Int`
- `stock Int @default(0)`
- `weightGrams Int @default(500)`
- `attributes Json`
- `imageUrl String?`
- `isDefault Boolean @default(false)`
- `isActive Boolean @default(true)`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

Add relations:
- `Product.variants ProductVariant[]`
- `CartItem.variantId String?`
- `CartItem.variant ProductVariant?`
- `OrderItem.variantId String?`
- `OrderItem.variant ProductVariant?`

Add order snapshot fields:
- `variantName String?`
- `variantSku String?`
- `variantAttributes Json?`

Cart uniqueness changes from `@@unique([userId, productId])` to `@@unique([userId, productId, variantId])`. Because PostgreSQL treats nullable values in unique indexes as distinct, the implementation must also enforce one no-variant cart row per user/product in repository logic for products without variants.

## Backend Behavior

Product read APIs:
- Include variants ordered with default variant first, then active variants by name.
- Product list cards continue to use base product price and stock unless a default variant exists. If a default active variant exists, list display may show that variant's price/stock as the effective default.
- Product detail returns all active variants and enough attribute data for the frontend picker.

Product writes:
- `CreateProductDto` accepts optional `variants`.
- `UpdateProductDto` accepts optional replacement variants for simple admin/API usage.
- At most one active default variant is allowed per product. If variants exist and none is marked default, the first active variant becomes default during seed or create.

Cart:
- `AddCartItemDto` accepts optional `variantId`.
- If `variantId` is provided, it must belong to the selected product and be active.
- Stock validation uses `variant.stock` when variant is selected, otherwise `product.stock`.
- Price, weight, image, and label in cart use variant values when present.
- Two variants of the same product appear as two separate cart rows.
- Removing/updating a variant row must target both `productId` and `variantId`.

Orders:
- Checkout validates stock again using variant stock when present.
- Order item price is captured from the selected variant when present.
- Order item stores product and variant snapshot fields so historical orders remain readable even if the variant changes later.
- The phase does not deduct stock yet unless the existing order flow already deducts product stock. Variant stock deduction will be aligned with the existing inventory behavior rather than introduced as a separate hidden side effect.

## Frontend Behavior

Catalog detail:
- If a product has variants, show a compact variant picker grouped by attribute keys.
- Initial selection is the default active variant.
- Price, stock status, SKU, primary image, and add-to-cart payload update when the selected variant changes.
- Add-to-cart is disabled when selected variant stock is zero.

Catalog cards:
- Continue to render normally.
- If default variant data is available, show its price as the effective price.

Cart and checkout:
- Show variant name and attributes under product name.
- Use variant image when available.
- Quantity updates and removal send `variantId` where needed.

Orders:
- Show variant name/attributes in order item rows.

Admin:
- This phase keeps admin support basic. Product create/update APIs support variants, and seeded products demonstrate the data. Full admin variant editing is deferred to the next admin-focused phase.

## API Contracts

`ProductVariantDto`:
- `id`
- `productId`
- `sku`
- `name`
- `priceVnd`
- `priceUsd`
- `stock`
- `weightGrams`
- `attributes`
- `imageUrl`
- `isDefault`
- `isActive`

`CartItemDto` adds:
- `variantId`
- `variantName`
- `variantSku`
- `variantAttributes`

`AddCartItemDto` adds:
- `variantId?: string`

Update/remove cart APIs should accept variant identity in a backward-compatible way:
- Existing routes using only `productId` continue working for no-variant items.
- Variant-aware operations include `variantId` as request body or query parameter.

## Error Handling

- Missing product: existing product not found error.
- Variant does not belong to product: `BadRequestException`.
- Inactive variant: `BadRequestException`.
- Insufficient variant stock: same style as current cart/order stock errors.
- Selecting a variant for a product with no variants: `BadRequestException`.
- Omitting variant for a product with variants: default variant is selected if available; otherwise error.

## Testing

Backend:
- Product repository/service includes variants in list/detail responses.
- Cart can add two variants of one product as two rows.
- Cart rejects inactive or unrelated variants.
- Cart totals use variant prices.
- Order placement snapshots variant fields.

Frontend:
- Type-check all affected apps.
- Browser smoke: product detail variant picker changes displayed price/stock and add-to-cart sends selected variant.
- Cart/checkout show selected variant labels.

Migration verification:
- Prisma client generation succeeds.
- Existing products without variants remain readable and addable to cart.
- Seed completes and includes variant examples.

## Delivery Order

1. Database schema, generated client, and seed variants.
2. Backend product/cart/order support and tests.
3. Frontend catalog variant picker.
4. Frontend cart/checkout/order display updates.
5. Verification and smoke test.

Each implementation batch must be committed after verification, matching the user's request to commit after each edit cycle.
