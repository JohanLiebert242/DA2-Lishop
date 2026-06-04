import { expect, test } from '@playwright/test';

const PROMOTIONS_URL = process.env['E2E_PROMOTIONS_URL'] ?? 'http://localhost:3007';

test.describe('promotions page', () => {
  test('coupon copy shows feedback, section names are explicit, and only section countdown remains', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            (window as Window & { __copiedCoupon?: string }).__copiedCoupon = value;
          },
        },
      });
    });

    const now = Date.now();
    await page.route('**/promotions/flash-sales/active', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'flash-1',
              startAt: new Date(now - 60_000).toISOString(),
              endAt: new Date(now + 3_600_000).toISOString(),
              isActive: true,
              items: [
                {
                  id: 'flash-item-1',
                  discountPercent: 25,
                  product: {
                    id: 'product-1',
                    name: 'E2E Serum',
                    slug: 'e2e-serum',
                    priceVnd: 400000,
                    images: [{ url: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883' }],
                  },
                },
              ],
            },
          ],
        }),
      });
    });

    await page.route('**/promotions/coupons', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'coupon-1',
              code: 'SAVE10',
              type: 'PERCENT',
              value: 10,
              minOrderVnd: 200000,
              maxUses: 100,
              usedCount: 1,
              expiresAt: new Date(now + 86_400_000).toISOString(),
            },
            {
              id: 'coupon-2',
              code: 'FREESHIP',
              type: 'FREE_SHIPPING',
              value: 0,
              minOrderVnd: 0,
              maxUses: null,
              usedCount: 0,
              expiresAt: null,
            },
          ],
        }),
      });
    });

    await page.goto(`${PROMOTIONS_URL}/promotions`);

    await expect(page.getByText('Su kien: Flash Sale dang chay')).toBeVisible();
    await expect(page.getByText('Su kien: Ma giam gia hot')).toBeVisible();
    await expect(page.getByTestId('section-countdown').first()).toBeVisible();
    await expect(page.getByTestId('page-countdown')).toHaveCount(0);

    const saveCoupon = page.getByTestId('coupon-card-SAVE10');
    await expect(saveCoupon).toBeVisible();
    await expect(saveCoupon.getByText('Copied')).toHaveCount(0);
    await saveCoupon.getByRole('button', { name: /copy/i }).click();

    await expect(page.getByRole('status')).toHaveText(/Da copy ma SAVE10/);
    await expect(saveCoupon.getByText('Copied')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => (window as Window & { __copiedCoupon?: string }).__copiedCoupon))
      .toBe('SAVE10');
  });
});
