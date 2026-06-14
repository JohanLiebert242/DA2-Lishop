import { expect, test } from '@playwright/test';

const CATALOG_URL = process.env['E2E_CATALOG_URL'] ?? 'http://localhost:3002';

test.describe('catalog product filters', () => {
  test('shows readable contextual badges and product card CTA text', async ({ page }) => {
    await page.route('**/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.route('**/products/recommendations**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { fallback: true, items: [] } }),
      });
    });

    await page.route('**/products?*', async (route) => {
      const url = new URL(route.request().url());
      const minRating = url.searchParams.get('minRating');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items: [
              {
                id: 'p-1',
                name: minRating === '1' ? 'Loa mini 1 sao' : 'Tai nghe sale freeship',
                slug: 'tai-nghe-sale-freeship',
                sku: 'P-1',
                priceVnd: 890000,
                priceUsd: 36,
                stock: 8,
                averageRating: minRating === '1' ? 1.4 : 4.6,
                reviewCount: 12,
                categoryId: 'c-1',
                brand: 'Lishop',
                images: [],
                variants: [],
                tags: [{ tag: { name: 'sale' } }],
                category: { id: 'c-1', name: 'Âm thanh', slug: 'audio' },
                createdAt: new Date().toISOString(),
              },
            ],
            nextCursor: null,
          },
        }),
      });
    });

    await page.goto(`${CATALOG_URL}/products`, { waitUntil: 'domcontentloaded' });

    const firstCard = page.locator('a[href^="/products/"]').first();
    await expect(firstCard.getByText('Đang giảm giá')).toBeVisible();
    await expect(firstCard.getByText('Miễn phí giao hàng')).toBeVisible();
    await expect(firstCard.getByText('Còn hàng')).toBeVisible();
    await expect(firstCard.getByText('Xem chi tiết')).toBeVisible();

    await page.getByRole('button', { name: '1 sao' }).click();
    await expect(page.getByText('Loa mini 1 sao')).toBeVisible();
  });
});

