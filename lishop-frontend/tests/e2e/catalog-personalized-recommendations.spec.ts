import { expect, test } from '@playwright/test';

const CATALOG_URL = process.env['E2E_CATALOG_URL'] ?? 'http://localhost:3002';

test.describe('catalog personalized recommendations', () => {
  test('shows "Danh cho ban" block from recommendations endpoint', async ({ page }) => {
    await page.route('**/products/recommendations**', async (route) => {
      // Avoid breaking Next.js navigations if this pattern ever matches a document request.
      if (route.request().resourceType() === 'document') return route.fallback();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            fallback: false,
            reason: 'Vi ban hay mua do uong.',
            items: [
              {
                id: 'p1',
                name: 'Tra sua it duong',
                slug: 'tra-sua-it-duong',
                description: 'It duong, de uong',
                priceVnd: 55000,
                stock: 10,
                averageRating: 4.7,
                reviewCount: 31,
                brand: 'Lishop',
                category: { id: 'c1', name: 'Do uong', slug: 'do-uong' },
                images: [],
              },
              {
                id: 'p2',
                name: 'Banh hanh nhan',
                slug: 'banh-hanh-nhan',
                description: 'Thom ngon',
                priceVnd: 89000,
                stock: 5,
                averageRating: 4.6,
                reviewCount: 18,
                brand: 'Lishop',
                category: { id: 'c2', name: 'An vat', slug: 'an-vat' },
                images: [],
              },
            ],
          },
        }),
      });
    });

    await page.goto(`${CATALOG_URL}/products`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('personalized-recs')).toBeVisible();
    await expect(page.getByTestId('personalized-recs')).toContainText('Danh cho ban');
    await expect(page.getByTestId('personalized-recs')).toContainText('Vi ban hay mua');
    await expect(page.getByTestId('personalized-rec-item-tra-sua-it-duong')).toBeVisible();
    await expect(page.getByTestId('personalized-rec-item-banh-hanh-nhan')).toBeVisible();
  });
});

