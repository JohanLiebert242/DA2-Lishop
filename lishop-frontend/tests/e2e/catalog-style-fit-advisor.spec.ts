import { expect, test, type APIRequestContext } from '@playwright/test';

const API_URL = process.env['E2E_API_URL'] ?? 'http://127.0.0.1:4000';
const CATALOG_URL = process.env['E2E_CATALOG_URL'] ?? 'http://localhost:3002';

type ProductVariant = {
  id: string;
  stock: number;
  attributes: Record<string, string>;
};

type ProductSummary = {
  id: string;
  slug: string;
  variants: ProductVariant[];
};

type ProductListResponse = {
  items: ProductSummary[];
  nextCursor: string | null;
};

async function unwrap<T>(response: { json(): Promise<unknown> }): Promise<T> {
  const json = await response.json();
  return (json.data ?? json) as T;
}

async function getSizedVariantProduct(request: APIRequestContext) {
  let cursor: string | null = null;
  let product: ProductSummary | undefined;
  for (let page = 0; page < 5 && !product; page += 1) {
    const response = await request.get(`${API_URL}/products?limit=100${cursor ? `&cursor=${cursor}` : ''}`);
    expect(response.ok()).toBeTruthy();
    const products = await unwrap<ProductListResponse>(response);
    product = products.items.find((item) =>
      item.variants.some((variant) => typeof variant.attributes?.size === 'string' && variant.attributes.size.trim()),
    );
    cursor = products.nextCursor ?? null;
    if (!cursor) break;
  }

  expect(product, 'seeded catalog should include a product with size variants').toBeTruthy();
  return product!;
}

test.describe('catalog style fit advisor', () => {
  test('shows fit advice and auto-selects the recommended variant', async ({ page, request }) => {
    const product = await getSizedVariantProduct(request);
    const recommendedVariant = product.variants.find((variant) => variant.attributes?.size && variant.stock > 0)
      ?? product.variants.find((variant) => variant.attributes?.size);

    expect(recommendedVariant).toBeTruthy();

    await page.route('**/shopping/style-fit-advisor', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            recommendedVariantId: recommendedVariant!.id,
            recommendedSize: recommendedVariant!.attributes.size,
            confidence: 'high',
            fitSummary: 'Cỡ này sẽ gọn dáng và dễ mặc hằng ngày.',
            reasons: ['Chiều cao và cân nặng phù hợp với cỡ này.'],
            styleTips: ['Phối với quần ống đứng và giày tối giản.'],
            warnings: [],
            fallback: false,
          },
        }),
      });
    });

    await page.goto(`${CATALOG_URL}/products/${product.slug}`, { waitUntil: 'domcontentloaded' });

    const panel = page.getByTestId('style-fit-advisor');
    await panel.getByRole('button', { name: 'Tư vấn chọn cỡ' }).click();
    await panel.getByLabel('Chiều cao (cm)').fill('170');
    await panel.getByLabel('Cân nặng (kg)').fill('62');
    await panel.getByRole('button', { name: 'Nhận gợi ý' }).click();

    await expect(panel).toContainText('Cỡ này sẽ gọn dáng');
    await expect(panel).toContainText(`Cỡ gợi ý: ${recommendedVariant!.attributes.size}`);
    await expect(page.getByRole('button', { name: recommendedVariant!.attributes.size, exact: true })).toHaveAttribute('aria-pressed', 'true');
  });
});
