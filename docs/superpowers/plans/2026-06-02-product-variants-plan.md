# Product Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add selectable product variants across catalog, cart, checkout, and order flows without breaking products that do not use variants.

**Architecture:** Variants live as child records of `Product` and are optional in cart/order line items. Backend services resolve an effective purchasable item from `productId + optional variantId`, then cart/order APIs snapshot the selected variant. Frontend catalog picks a variant on product detail and downstream MFEs display the variant label/attributes.

**Tech Stack:** Prisma/PostgreSQL, NestJS, class-validator DTOs, Jest, Next.js App Router, React Query, TypeScript, pnpm/corepack.

---

## Task 1: Database Schema And Seed Data

**Files:**
- Modify: `lishop-backend/packages/database/prisma/schema.prisma`
- Modify: `lishop-backend/packages/database/prisma/seed.ts`

- [ ] **Step 1: Add `ProductVariant` model and relations**

Update `Product`, `CartItem`, and `OrderItem` in `schema.prisma`:

```prisma
model Product {
  // existing fields stay unchanged
  variants ProductVariant[]
}

model ProductVariant {
  id           String   @id @default(uuid())
  productId    String
  sku          String   @unique
  name         String
  priceVnd     Int
  priceUsd     Int
  stock        Int      @default(0)
  weightGrams  Int      @default(500)
  attributes   Json
  imageUrl     String?
  isDefault    Boolean  @default(false)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  product    Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  cartItems  CartItem[]
  orderItems OrderItem[]

  @@index([productId])
  @@index([isActive])
}
```

Extend cart/order:

```prisma
model CartItem {
  variantId String?
  variant   ProductVariant? @relation(fields: [variantId], references: [id])

  @@unique([userId, productId, variantId])
}

model OrderItem {
  variantId         String?
  variantName       String?
  variantSku        String?
  variantAttributes Json?

  variant ProductVariant? @relation(fields: [variantId], references: [id])
}
```

- [ ] **Step 2: Add variants to seed products**

For selected products in `seed.ts`, add `variants` arrays next to `images`:

```ts
variants: [
  {
    sku: 'IPHONE15PM-256-TITAN',
    name: 'Titanium 256GB',
    priceVnd: 34_990_000,
    priceUsd: 1458,
    stock: 20,
    weightGrams: 240,
    attributes: { color: 'Titanium', storage: '256GB' },
    imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600',
    isDefault: true,
    isActive: true,
  },
  {
    sku: 'IPHONE15PM-512-BLUE',
    name: 'Blue Titanium 512GB',
    priceVnd: 39_990_000,
    priceUsd: 1666,
    stock: 12,
    weightGrams: 240,
    attributes: { color: 'Blue Titanium', storage: '512GB' },
    imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600',
    isDefault: false,
    isActive: true,
  },
]
```

Add similar variants for MacBook, Lacoste polo, and Nike shoes.

- [ ] **Step 3: Persist variants during seed create**

Where seed currently does:

```ts
const { images, tags, ...productData } = p;
```

change to:

```ts
const { images, tags, variants, ...productData } = p;
```

and include:

```ts
variants: variants?.length ? { create: variants } : undefined,
```

- [ ] **Step 4: Generate Prisma client and verify schema**

Run:

```bash
cd lishop-backend
corepack pnpm --filter @lishop/database db:generate
corepack pnpm --filter @lishop/api type-check
```

Expected: both exit `0`.

- [ ] **Step 5: Commit database batch**

Run:

```bash
git add lishop-backend/packages/database/prisma/schema.prisma lishop-backend/packages/database/prisma/seed.ts
git commit -m "feat: add product variant schema"
```

## Task 2: Backend Product, Cart, And Order Support

**Files:**
- Modify: `lishop-backend/apps/api/src/modules/products/products.repository.ts`
- Modify: `lishop-backend/apps/api/src/modules/products/dto/create-product.dto.ts`
- Modify: `lishop-backend/apps/api/src/modules/products/dto/update-product.dto.ts`
- Modify: `lishop-backend/apps/api/src/modules/cart/dto/add-cart-item.dto.ts`
- Modify: `lishop-backend/apps/api/src/modules/cart/dto/update-cart-item.dto.ts`
- Modify: `lishop-backend/apps/api/src/modules/cart/cart.repository.ts`
- Modify: `lishop-backend/apps/api/src/modules/cart/cart.service.ts`
- Modify: `lishop-backend/apps/api/src/modules/cart/cart.controller.ts`
- Modify: `lishop-backend/apps/api/src/modules/orders/orders.service.ts`
- Modify: `lishop-backend/apps/api/src/modules/orders/orders.repository.ts`
- Test: `lishop-backend/apps/api/src/modules/cart/cart.service.spec.ts`
- Test: `lishop-backend/apps/api/src/modules/orders/orders.service.spec.ts`
- Test: `lishop-backend/apps/api/src/modules/products/products.service.spec.ts`

- [ ] **Step 1: Extend product repository include**

Add this include to every product read/create/update return:

```ts
variants: {
  where: { isActive: true },
  orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
},
```

Extend `ProductWithDetails` with `variants`.

- [ ] **Step 2: Add variant DTOs**

Create nested DTOs in `create-product.dto.ts`:

```ts
export class ProductVariantInputDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) sku!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(255) name!: string;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) priceVnd!: number;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) priceUsd!: number;
  @ApiProperty() @IsInt() @Min(0) @Type(() => Number) stock!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number) weightGrams?: number;
  @ApiProperty() attributes!: Record<string, string>;
  @ApiPropertyOptional() @IsOptional() @IsUrl() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() isDefault?: boolean;
  @ApiPropertyOptional() @IsOptional() isActive?: boolean;
}
```

Add `variants?: ProductVariantInputDto[]` to create and update DTOs.

- [ ] **Step 3: Add `variantId` to cart DTOs**

In `AddCartItemDto` and `UpdateCartItemDto`, add:

```ts
@ApiPropertyOptional()
@IsOptional()
@IsUUID()
variantId?: string;
```

- [ ] **Step 4: Make cart repository variant-aware**

Update `CartRow` to include `variantId` and `variant`. Add repository methods:

```ts
async findProductWithVariant(productId: string, variantId?: string | null): Promise<ProductPurchaseInfo | null>;
async addOrUpdate(userId: string, productId: string, variantId: string | null, quantity: number): Promise<void>;
async remove(userId: string, productId: string, variantId?: string | null): Promise<void>;
```

For no-variant rows, use `findFirst` + `create/update` instead of relying only on nullable unique behavior.

- [ ] **Step 5: Resolve effective cart item in service**

In `CartService`, resolve:

```ts
const effective = row.variant ?? row.product;
```

Cart item fields use variant values when present:

```ts
variantId: row.variantId,
variantName: row.variant?.name ?? null,
variantSku: row.variant?.sku ?? null,
variantAttributes: row.variant?.attributes ?? null,
priceVnd: row.variant?.priceVnd ?? row.product.priceVnd,
stock: row.variant?.stock ?? row.product.stock,
imageUrl: row.variant?.imageUrl ?? row.product.images[0]?.url ?? null,
```

- [ ] **Step 6: Snapshot variants in orders**

When mapping cart items to order items, include:

```ts
variantId: item.variantId,
variantName: item.variantName,
variantSku: item.variantSku,
variantAttributes: item.variantAttributes,
```

Ensure `OrdersRepository.create` writes those fields.

- [ ] **Step 7: Add backend tests**

Update specs to prove:
- Adding two variants of the same product creates two cart rows.
- Variant stock and variant price are used.
- Unrelated variant is rejected.
- Order item snapshots `variantName`, `variantSku`, and `variantAttributes`.

- [ ] **Step 8: Verify backend**

Run:

```bash
cd lishop-backend
corepack pnpm --filter @lishop/api test
corepack pnpm --filter @lishop/api type-check
corepack pnpm --filter @lishop/api build
```

Expected: all exit `0`. If build fails with `EPERM` under OneDrive, stop the API watcher, delete only `apps/api/dist`, and rerun build.

- [ ] **Step 9: Commit backend batch**

Run:

```bash
git add lishop-backend
git commit -m "feat: support product variants in backend"
```

## Task 3: Catalog Variant Picker

**Files:**
- Modify: `lishop-frontend/apps/mfe-catalog/src/lib/catalog-api.ts`
- Modify: `lishop-frontend/apps/mfe-catalog/src/app/products/[slug]/product-detail-client.tsx`
- Modify: `lishop-frontend/apps/mfe-catalog/src/components/product-card.tsx`
- Modify: `lishop-frontend/apps/mfe-catalog/src/lib/cart-helper.ts`

- [ ] **Step 1: Add frontend variant types**

Add:

```ts
export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string;
  priceVnd: number;
  priceUsd: number;
  stock: number;
  weightGrams: number;
  attributes: Record<string, string>;
  imageUrl: string | null;
  isDefault: boolean;
  isActive: boolean;
}
```

Add `variants: ProductVariant[]` to product summary/detail.

- [ ] **Step 2: Make add-to-cart accept variant**

Change catalog cart helper to:

```ts
export async function addToCart(productId: string, quantity: number, variantId?: string) {
  return apiFetch('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity, ...(variantId && { variantId }) }),
  });
}
```

- [ ] **Step 3: Add selected variant state**

In product detail client:

```ts
const defaultVariant = product.variants.find((v) => v.isDefault) ?? product.variants[0] ?? null;
const [selectedVariantId, setSelectedVariantId] = useState(defaultVariant?.id ?? null);
const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) ?? defaultVariant;
```

- [ ] **Step 4: Render variant picker**

Show grouped attribute buttons under price/SKU. For each variant, render a button with `variant.name`, attributes, price delta, and disabled state when `stock === 0`.

- [ ] **Step 5: Use selected variant for display and cart**

Displayed price/stock/SKU/image use selected variant when present. `handleAddToCart` calls:

```ts
await addToCart(product.id, qty, selectedVariant?.id);
```

- [ ] **Step 6: Verify catalog**

Run:

```bash
cd lishop-frontend
corepack pnpm --filter @lishop/mfe-catalog type-check
```

Expected: exit `0`.

- [ ] **Step 7: Commit catalog batch**

Run:

```bash
git add lishop-frontend/apps/mfe-catalog
git commit -m "feat: add catalog variant picker"
```

## Task 4: Cart, Checkout, And Orders Variant Display

**Files:**
- Modify: `lishop-frontend/apps/mfe-cart/src/lib/cart-api.ts`
- Modify: `lishop-frontend/apps/mfe-cart/src/app/cart/page.tsx`
- Modify: `lishop-frontend/apps/mfe-checkout/src/lib/cart-api.ts`
- Modify: `lishop-frontend/apps/mfe-checkout/src/app/checkout/page.tsx`
- Modify: `lishop-frontend/apps/mfe-orders/src/lib/orders-api.ts`
- Modify: `lishop-frontend/apps/mfe-orders/src/app/orders/page.tsx`

- [ ] **Step 1: Extend cart item frontend types**

Add to every cart item type:

```ts
variantId: string | null;
variantName: string | null;
variantSku: string | null;
variantAttributes: Record<string, string> | null;
```

- [ ] **Step 2: Update cart API calls**

Update quantity/remove calls to pass variant identity:

```ts
updateItem(productId: string, quantity: number, variantId?: string | null)
removeItem(productId: string, variantId?: string | null)
```

Use query/body according to backend controller implementation.

- [ ] **Step 3: Render variant labels**

Under product name, render:

```tsx
{item.variantName && <p className="text-xs text-gray-500">{item.variantName}</p>}
{item.variantAttributes && (
  <p className="text-xs text-gray-400">
    {Object.entries(item.variantAttributes).map(([k, v]) => `${k}: ${v}`).join(' · ')}
  </p>
)}
```

- [ ] **Step 4: Use stable item keys**

Change item keys from `productId` to:

```ts
`${item.productId}:${item.variantId ?? 'base'}`
```

- [ ] **Step 5: Update checkout and order displays**

Checkout summary and order history show the same variant label/attributes.

- [ ] **Step 6: Verify frontend apps**

Run:

```bash
cd lishop-frontend
corepack pnpm --filter @lishop/mfe-cart type-check
corepack pnpm --filter @lishop/mfe-checkout type-check
corepack pnpm --filter @lishop/mfe-orders type-check
```

Expected: all exit `0`.

- [ ] **Step 7: Commit display batch**

Run:

```bash
git add lishop-frontend/apps/mfe-cart lishop-frontend/apps/mfe-checkout lishop-frontend/apps/mfe-orders
git commit -m "feat: display variants in cart and orders"
```

## Task 5: Migration, Smoke Test, And Runtime Verification

**Files:**
- Modify only if verification exposes a real bug.

- [ ] **Step 1: Apply local schema sync**

Run:

```bash
cd lishop-backend/packages/database
corepack pnpm prisma db push
```

Expected: database sync succeeds.

- [ ] **Step 2: Seed or update local variant data**

Run:

```bash
cd lishop-backend/packages/database
corepack pnpm prisma db seed
```

Expected: seed finishes and logs seed accounts.

- [ ] **Step 3: Restart backend and affected frontend apps**

If dev servers are running, restart backend API and affected MFEs so they pick up generated Prisma/types.

- [ ] **Step 4: Browser smoke test**

Verify:
- Product detail renders variants for seeded product.
- Selecting a variant updates price/stock.
- Add-to-cart selected variant succeeds.
- Cart shows the selected variant.
- Checkout shows the selected variant.
- Placing an order snapshots the variant.

- [ ] **Step 5: Final checks**

Run:

```bash
git diff --check
git status --short
```

Expected: no unwanted generated artifacts staged or left untracked.

- [ ] **Step 6: Commit any verification fixes**

If smoke test required code fixes, commit them with:

```bash
git add lishop-backend lishop-frontend
git commit -m "fix: complete product variant flow"
```

If no code changed, no commit is needed.
