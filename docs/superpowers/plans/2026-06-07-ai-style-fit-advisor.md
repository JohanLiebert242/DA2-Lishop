# AI Style/Fit Advisor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an AI Style/Fit Advisor on product detail pages that recommends a valid size/variant and styling guidance from shopper measurements.

**Architecture:** Add a focused `ShoppingStyleFitAdvisorService` in the existing shopping module, exposed through `POST /shopping/style-fit-advisor`. The service loads one product with variants, calls OpenAI with grounded context when configured, validates AI output against real variants, and falls back to deterministic size heuristics. The catalog app adds typed API support and a compact advisor panel that can select the recommended variant through existing product detail state.

**Tech Stack:** NestJS, class-validator, OpenAI Responses API via `fetch`, Prisma-backed `ProductsRepository`, Next.js/React, TanStack Query mutations, Playwright e2e.

---

## File Structure

- Create `lishop-backend/apps/api/src/modules/shopping/shopping-style-fit-advisor.service.spec.ts`
  - Unit tests for OpenAI, fallback, invalid AI variant, and no-size products.
- Create `lishop-backend/apps/api/src/modules/shopping/shopping-style-fit-advisor.service.ts`
  - Request/response types, product context mapping, OpenAI call, parser, validation, fallback heuristic.
- Modify `lishop-backend/apps/api/src/modules/products/products.repository.ts`
  - Change `findById` to return `ProductWithDetails | null` using existing `PRODUCT_INCLUDE`.
- Modify `lishop-backend/apps/api/src/modules/products/products.service.ts`
  - Add `findById(id): Promise<ProductWithDetails>` for shopping service use.
- Modify `lishop-backend/apps/api/src/modules/shopping/shopping.controller.ts`
  - Add DTO and `POST /shopping/style-fit-advisor`.
- Modify `lishop-backend/apps/api/src/modules/shopping/shopping.module.ts`
  - Register the new advisor service.
- Modify `lishop-frontend/apps/mfe-catalog/src/lib/catalog-api.ts`
  - Add request/response types and `styleFitAdvisor`.
- Modify `lishop-frontend/apps/mfe-catalog/src/app/products/[slug]/product-detail-client.tsx`
  - Add advisor form/result UI and connect "choose this size" to existing variant state.
- Create `lishop-frontend/tests/e2e/catalog-style-fit-advisor.spec.ts`
  - E2E for opening product detail, submitting measurements, displaying recommendation, and selecting the suggested size.

---

### Task 1: Backend Red Test For Style/Fit Advisor

**Files:**
- Create: `lishop-backend/apps/api/src/modules/shopping/shopping-style-fit-advisor.service.spec.ts`

- [ ] **Step 1: Write the failing service tests**

Create the spec with this behavior shape:

```ts
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ShoppingStyleFitAdvisorService } from './shopping-style-fit-advisor.service';
import { ProductsService } from '../products/products.service';

const variants = [
  {
    id: 'v-s',
    productId: 'p1',
    sku: 'AO-S',
    name: 'Size S',
    priceVnd: 300000,
    priceUsd: 1200,
    stock: 4,
    weightGrams: 400,
    attributes: { size: 'S', color: 'Den' },
    imageUrl: null,
    isDefault: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'v-m',
    productId: 'p1',
    sku: 'AO-M',
    name: 'Size M',
    priceVnd: 300000,
    priceUsd: 1200,
    stock: 8,
    weightGrams: 400,
    attributes: { size: 'M', color: 'Den' },
    imageUrl: null,
    isDefault: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
] as any[];

const product = {
  id: 'p1',
  name: 'Ao blazer basic',
  slug: 'ao-blazer-basic',
  sku: 'AO-BLAZER',
  description: 'Ao blazer form gon, chat vai mem.',
  priceVnd: 300000,
  priceUsd: 1200,
  stock: 12,
  averageRating: 4.6,
  reviewCount: 17,
  categoryId: 'c1',
  category: { id: 'c1', name: 'Thoi trang', slug: 'thoi-trang' },
  brand: 'Lishop',
  images: [{ id: 'img1', url: 'https://example.com/a.jpg', alt: 'Ao blazer', isPrimary: true }],
  tags: [],
  variants,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ShoppingStyleFitAdvisorService', () => {
  let service: ShoppingStyleFitAdvisorService;
  const productsService = { findById: jest.fn() };
  const config = { get: jest.fn((key: string) => (key === 'OPENAI_MODEL' ? 'gpt-5.2' : '')) };

  beforeEach(async () => {
    jest.restoreAllMocks();
    productsService.findById.mockResolvedValue(product);
    config.get.mockImplementation((key: string) => (key === 'OPENAI_MODEL' ? 'gpt-5.2' : ''));
    const moduleRef = await Test.createTestingModule({
      providers: [
        ShoppingStyleFitAdvisorService,
        { provide: ProductsService, useValue: productsService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = moduleRef.get(ShoppingStyleFitAdvisorService);
  });

  it('uses OpenAI and returns a valid recommended variant', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'sk-test';
      if (key === 'OPENAI_MODEL') return 'gpt-5.2';
      return '';
    });
    jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          recommendedVariantId: 'v-m',
          recommendedSize: 'M',
          confidence: 'high',
          fitSummary: 'Size M se vua vai va thoai mai.',
          reasons: ['Chieu cao va can nang phu hop size M'],
          styleTips: ['Phoi voi quan tay ong dung'],
          warnings: [],
        }),
      }),
    } as any);

    const result = await service.advise({
      productId: 'p1',
      heightCm: 170,
      weightKg: 62,
      preferredFit: 'regular',
      occasion: 'di lam',
    });

    expect(result.recommendedVariantId).toBe('v-m');
    expect(result.recommendedSize).toBe('M');
    expect(result.confidence).toBe('high');
    expect(result.fallback).toBe(false);
  });

  it('returns deterministic fallback when OpenAI key is missing', async () => {
    const result = await service.advise({
      productId: 'p1',
      heightCm: 169,
      weightKg: 61,
      preferredFit: 'regular',
    });

    expect(result.fallback).toBe(true);
    expect(result.recommendedVariantId).toBe('v-m');
    expect(result.recommendedSize).toBe('M');
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('falls back when AI recommends a variant outside the product', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'sk-test';
      if (key === 'OPENAI_MODEL') return 'gpt-5.2';
      return '';
    });
    jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          recommendedVariantId: 'not-real',
          recommendedSize: 'XXL',
          confidence: 'high',
          fitSummary: 'Bad output',
          reasons: [],
          styleTips: [],
          warnings: [],
        }),
      }),
    } as any);

    const result = await service.advise({
      productId: 'p1',
      heightCm: 170,
      weightKg: 62,
      preferredFit: 'regular',
    });

    expect(result.fallback).toBe(true);
    expect(['v-s', 'v-m']).toContain(result.recommendedVariantId);
  });

  it('handles products without size variants', async () => {
    productsService.findById.mockResolvedValue({ ...product, variants: [] });

    const result = await service.advise({
      productId: 'p1',
      heightCm: 170,
      weightKg: 62,
      preferredFit: 'regular',
    });

    expect(result.fallback).toBe(true);
    expect(result.recommendedVariantId).toBeUndefined();
    expect(result.confidence).toBe('low');
    expect(result.warnings.join(' ')).toContain('size');
  });
});
```

- [ ] **Step 2: Run red test**

Run:

```powershell
corepack pnpm --filter @lishop/api test -- shopping-style-fit-advisor.service.spec.ts
```

Expected: FAIL because `./shopping-style-fit-advisor.service` does not exist.

- [ ] **Step 3: Commit is not done in red state**

Do not commit this task yet. Continue to Task 2 and commit after green.

---

### Task 2: Backend Implementation

**Files:**
- Create: `lishop-backend/apps/api/src/modules/shopping/shopping-style-fit-advisor.service.ts`
- Modify: `lishop-backend/apps/api/src/modules/products/products.repository.ts`
- Modify: `lishop-backend/apps/api/src/modules/products/products.service.ts`
- Modify: `lishop-backend/apps/api/src/modules/shopping/shopping.controller.ts`
- Modify: `lishop-backend/apps/api/src/modules/shopping/shopping.module.ts`

- [ ] **Step 1: Add product lookup by ID with full details**

Change `ProductsRepository.findById` to include `PRODUCT_INCLUDE` and return `ProductWithDetails | null`:

```ts
async findById(id: string): Promise<ProductWithDetails | null> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: PRODUCT_INCLUDE,
  }) as ProductWithDetails | null;
  return product ? this.withBrand(product) : null;
}
```

Add this method to `ProductsService`:

```ts
async findById(id: string): Promise<ProductWithDetails> {
  const product = await this.repo.findById(id);
  if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm: ${id}`);
  return product;
}
```

- [ ] **Step 2: Implement `ShoppingStyleFitAdvisorService`**

Create `shopping-style-fit-advisor.service.ts` with:

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductVariant } from '@lishop/database';
import { ProductsService } from '../products/products.service';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-5.2';
const FIT_VALUES = ['slim', 'regular', 'relaxed', 'oversized'] as const;
const CONFIDENCE_VALUES = ['low', 'medium', 'high'] as const;

export type PreferredFit = typeof FIT_VALUES[number];
export type FitConfidence = typeof CONFIDENCE_VALUES[number];

export interface StyleFitAdvisorRequest {
  productId: string;
  heightCm: number;
  weightKg: number;
  preferredFit: PreferredFit;
  bodyShape?: string;
  occasion?: string;
  notes?: string;
}

export interface StyleFitAdvisorResponse {
  recommendedVariantId?: string;
  recommendedSize?: string;
  confidence: FitConfidence;
  fitSummary: string;
  reasons: string[];
  styleTips: string[];
  warnings: string[];
  fallback: boolean;
}
```

The service should:

- call `this.productsService.findById(dto.productId)`,
- derive size variants using `variant.attributes.size` or case-insensitive `Size`,
- call OpenAI when `OPENAI_API_KEY` exists,
- parse `output_text` or nested Responses API output,
- validate `recommendedVariantId` against the product variants,
- return fallback on missing key, request failure, invalid JSON, or unknown variant.

Use these fallback rules:

```ts
private pickFallbackVariant(variants: ProductVariant[], dto: StyleFitAdvisorRequest): ProductVariant | undefined {
  const sized = variants.filter((variant) => this.getSizeValue(variant));
  const inStock = sized.filter((variant) => variant.stock > 0);
  const candidates = inStock.length > 0 ? inStock : sized;
  if (candidates.length === 0) return undefined;

  const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
  const base = dto.heightCm >= 180 || dto.weightKg >= 82
    ? 'XL'
    : dto.heightCm >= 172 || dto.weightKg >= 70
      ? 'L'
      : dto.heightCm >= 162 || dto.weightKg >= 52
        ? 'M'
        : 'S';
  const shift = dto.preferredFit === 'relaxed' ? 1 : dto.preferredFit === 'oversized' ? 2 : 0;
  const targetIndex = Math.min(order.length - 1, Math.max(0, order.indexOf(base) + shift));
  const wanted = order.slice(targetIndex);
  return candidates.find((variant) => wanted.includes(this.getSizeValue(variant)!.toUpperCase()))
    ?? candidates.find((variant) => this.getSizeValue(variant)!.toUpperCase() === base)
    ?? candidates[0];
}
```

- [ ] **Step 3: Add controller DTO and endpoint**

In `shopping.controller.ts`, import `IsIn`, `IsNumber`, `IsOptional`, `IsUUID`, `Max`, `Min`, and `ShoppingStyleFitAdvisorService`. Add DTO:

```ts
class StyleFitAdvisorDto {
  @IsUUID()
  productId!: string;

  @IsNumber()
  @Min(80)
  @Max(230)
  heightCm!: number;

  @IsNumber()
  @Min(20)
  @Max(250)
  weightKg!: number;

  @IsIn(['slim', 'regular', 'relaxed', 'oversized'])
  preferredFit!: 'slim' | 'regular' | 'relaxed' | 'oversized';

  @IsOptional()
  @IsString()
  bodyShape?: string;

  @IsOptional()
  @IsString()
  occasion?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

Update constructor:

```ts
constructor(
  private readonly conciergeService: ShoppingConciergeService,
  private readonly styleFitAdvisorService: ShoppingStyleFitAdvisorService,
) {}
```

Add endpoint:

```ts
@Public()
@Post('style-fit-advisor')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'AI Style/Fit Advisor for product variants' })
styleFitAdvisor(@Body() dto: StyleFitAdvisorDto) {
  return this.styleFitAdvisorService.advise(dto);
}
```

- [ ] **Step 4: Register provider**

In `shopping.module.ts`, add `ShoppingStyleFitAdvisorService` to `providers`.

- [ ] **Step 5: Run backend green tests**

Run:

```powershell
corepack pnpm --filter @lishop/api test -- shopping-style-fit-advisor.service.spec.ts
corepack pnpm --filter @lishop/api type-check
```

Expected: both pass.

- [ ] **Step 6: Commit backend**

```powershell
git add -- lishop-backend/apps/api/src/modules/shopping/shopping-style-fit-advisor.service.spec.ts lishop-backend/apps/api/src/modules/shopping/shopping-style-fit-advisor.service.ts lishop-backend/apps/api/src/modules/products/products.repository.ts lishop-backend/apps/api/src/modules/products/products.service.ts lishop-backend/apps/api/src/modules/shopping/shopping.controller.ts lishop-backend/apps/api/src/modules/shopping/shopping.module.ts
git commit -m "feat: add AI style fit advisor API"
```

---

### Task 3: Frontend API And Product Detail UI

**Files:**
- Modify: `lishop-frontend/apps/mfe-catalog/src/lib/catalog-api.ts`
- Modify: `lishop-frontend/apps/mfe-catalog/src/app/products/[slug]/product-detail-client.tsx`

- [ ] **Step 1: Add catalog API types**

In `catalog-api.ts`, add:

```ts
export type PreferredFit = 'slim' | 'regular' | 'relaxed' | 'oversized';

export interface StyleFitAdvisorRequest {
  productId: string;
  heightCm: number;
  weightKg: number;
  preferredFit: PreferredFit;
  bodyShape?: string;
  occasion?: string;
  notes?: string;
}

export interface StyleFitAdvisorResponse {
  recommendedVariantId?: string;
  recommendedSize?: string;
  confidence: 'low' | 'medium' | 'high';
  fitSummary: string;
  reasons: string[];
  styleTips: string[];
  warnings: string[];
  fallback: boolean;
}
```

Add method:

```ts
styleFitAdvisor: (payload: StyleFitAdvisorRequest) =>
  apiFetch<StyleFitAdvisorResponse>('/shopping/style-fit-advisor', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
```

- [ ] **Step 2: Add advisor state and mutation**

In `ProductDetailClient`, add state near other product state:

```ts
const [fitHeightCm, setFitHeightCm] = useState('170');
const [fitWeightKg, setFitWeightKg] = useState('60');
const [fitPreference, setFitPreference] = useState<PreferredFit>('regular');
const [fitOccasion, setFitOccasion] = useState('');
const [fitNotes, setFitNotes] = useState('');
const [fitResult, setFitResult] = useState<StyleFitAdvisorResponse | null>(null);
```

Add mutation:

```ts
const fitAdvisorMutation = useMutation({
  mutationFn: () => catalogApi.styleFitAdvisor({
    productId: product!.id,
    heightCm: Number(fitHeightCm),
    weightKg: Number(fitWeightKg),
    preferredFit: fitPreference,
    occasion: fitOccasion.trim() || undefined,
    notes: fitNotes.trim() || undefined,
  }),
  onSuccess: setFitResult,
  onError: (err: Error) => toast.error(err.message || 'Khong the tu van size luc nay'),
});
```

- [ ] **Step 3: Add helper for selecting a recommended variant**

Add:

```ts
function handleChooseFitVariant(variantId: string) {
  const variant = variants.find((item) => item.id === variantId);
  if (!variant) return;
  setSelectedVariantId(variant.id);
  setSelectedAttributes(variant.attributes ?? {});
  setQty(1);
  toast.success('Da chon size AI goi y');
}
```

- [ ] **Step 4: Add UI panel below variant controls and before quantity controls**

Add a `section` with `data-testid="style-fit-advisor"` containing:

- height input placeholder/name "Chieu cao",
- weight input placeholder/name "Can nang",
- preferred fit select,
- occasion input placeholder "Di lam, di choi, du lich...",
- notes textarea placeholder "Ghi chu ve dang nguoi hoac so thich...",
- submit button text "AI tu van size",
- result region showing `fitResult.recommendedSize`, `fitResult.fitSummary`, reasons, style tips, warnings,
- choose button `data-testid="choose-fit-variant"` when `fitResult.recommendedVariantId` exists and matches `variants`.

Keep visual style compact: white panel, warm border, no nested cards.

- [ ] **Step 5: Run frontend type-check**

Run:

```powershell
corepack pnpm --filter @lishop/mfe-catalog type-check
```

Expected: pass.

- [ ] **Step 6: Commit frontend UI**

```powershell
git add -- lishop-frontend/apps/mfe-catalog/src/lib/catalog-api.ts lishop-frontend/apps/mfe-catalog/src/app/products/[slug]/product-detail-client.tsx
git commit -m "feat: add catalog AI style fit advisor"
```

---

### Task 4: Playwright E2E

**Files:**
- Create: `lishop-frontend/tests/e2e/catalog-style-fit-advisor.spec.ts`

- [ ] **Step 1: Write failing e2e test**

Create a Playwright test that:

- routes `GET http://localhost:4000/products/ao-style-fit-test`,
- fulfills a product detail payload with variants S and M,
- routes reviews and related products to empty arrays,
- routes `POST http://localhost:4000/shopping/style-fit-advisor`,
- navigates to `/products/ao-style-fit-test`,
- fills advisor form,
- clicks "AI tu van size",
- expects "Size M" and mocked summary,
- clicks `data-testid="choose-fit-variant"`,
- expects the M variant button to be selected.

Use a specific assertion for selection by checking the M button class contains `border-indigo-500`.

- [ ] **Step 2: Run red e2e before UI exists if Task 3 has not been done**

If executing strictly before Task 3:

```powershell
corepack pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/catalog-style-fit-advisor.spec.ts --output=test-results-style-fit-red
```

Expected: FAIL because `style-fit-advisor` UI does not exist.

If Task 3 already exists, skip red verification for this e2e and document that backend service test provided the red phase.

- [ ] **Step 3: Run e2e green**

Run:

```powershell
$out = "test-results-style-fit-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
corepack pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/catalog-style-fit-advisor.spec.ts --output=$out
```

Expected: 1 passed.

- [ ] **Step 4: Remove generated Playwright output**

Delete only `lishop-frontend/test-results-style-fit-*` directories after verifying they are under `lishop-frontend`.

- [ ] **Step 5: Commit e2e**

```powershell
git add -- lishop-frontend/tests/e2e/catalog-style-fit-advisor.spec.ts
git commit -m "test: cover AI style fit advisor flow"
```

---

### Task 5: Final Verification

**Files:**
- No code changes unless verification finds a bug.

- [ ] **Step 1: Run backend tests**

```powershell
corepack pnpm --filter @lishop/api test
```

Expected: all suites pass.

- [ ] **Step 2: Run backend type-check**

```powershell
corepack pnpm --filter @lishop/api type-check
```

Expected: pass.

- [ ] **Step 3: Run catalog type-check**

```powershell
corepack pnpm --filter @lishop/mfe-catalog type-check
```

Expected: pass.

- [ ] **Step 4: Run Playwright e2e**

```powershell
$out = "test-results-style-fit-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
corepack pnpm dlx @playwright/test test -c playwright.config.ts tests/e2e/catalog-style-fit-advisor.spec.ts --output=$out
```

Expected: 1 passed.

- [ ] **Step 5: Clean generated artifacts**

Remove only generated `test-results-style-fit-*` directories after path verification. Do not stage `tsconfig.tsbuildinfo`, `.superpowers/`, `package.json`, or `package-lock.json` unless they become intentionally relevant.

- [ ] **Step 6: Report commits and verification**

Final response should include commit hashes and exact commands that passed.
