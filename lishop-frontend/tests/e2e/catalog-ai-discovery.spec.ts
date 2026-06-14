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
            reply: 'iPhone 15 phù hợp nếu bạn cần camera tốt và hiệu năng ổn định.',
            mode: 'advice',
            fallback: false,
            items: [
              {
                id: 'p-ai-1',
                name: 'iPhone 15',
                slug: 'iphone-15',
                description: 'Camera tốt, hiệu năng ổn định',
                priceVnd: 20000000,
                stock: 8,
                averageRating: 4.8,
                reviewCount: 120,
                category: { id: 'c1', name: 'Điện thoại', slug: 'dien-thoai' },
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
      .getByPlaceholder(/điện thoại chụp ảnh đẹp/i)
      .fill('điện thoại chụp ảnh đẹp dưới 20 triệu');
    await panel.getByRole('button', { name: 'Tư vấn' }).click();

    await expect(panel).toContainText('iPhone 15 phù hợp');
    await expect(panel.getByRole('link', { name: /iPhone 15/i })).toBeVisible();
    await expect(panel).toContainText('20.000.000');
    await panel.getByRole('link', { name: /iPhone 15/i }).click();
    await expect(page).toHaveURL(/\/products\/iphone-15$/);
  });
});
