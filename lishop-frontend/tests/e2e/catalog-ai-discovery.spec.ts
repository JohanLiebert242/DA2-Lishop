import { expect, test } from '@playwright/test';

const CATALOG_URL = process.env['E2E_CATALOG_URL'] ?? 'http://localhost:3002';

test.describe('catalog AI product discovery', () => {
  test('shows AI advice and suggested products from the discovery endpoint', async ({ page }) => {
    await page.route('**/products/ai-discovery', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            reply: 'iPhone 15 phu hop neu ban can camera tot va hieu nang on dinh.',
            mode: 'advice',
            fallback: false,
            items: [
              {
                id: 'p-ai-1',
                name: 'iPhone 15',
                slug: 'iphone-15',
                description: 'Camera tot, hieu nang on dinh',
                priceVnd: 20000000,
                stock: 8,
                averageRating: 4.8,
                reviewCount: 120,
                category: { id: 'c1', name: 'Dien thoai', slug: 'dien-thoai' },
                images: [],
              },
            ],
          },
        }),
      });
    });

    await page.goto(`${CATALOG_URL}/products`, { waitUntil: 'domcontentloaded' });

    const panel = page.getByTestId('ai-product-discovery');
    await expect(panel).toBeVisible();

    await panel
      .getByPlaceholder(/dien thoai chup anh dep/i)
      .fill('dien thoai chup anh dep duoi 20 trieu');
    await panel.getByRole('button', { name: 'Tu van' }).click();

    await expect(panel).toContainText('iPhone 15 phu hop');
    await expect(panel.getByRole('link', { name: /iPhone 15/i })).toBeVisible();
    await expect(panel).toContainText('20.000.000');
  });
});
