import { expect, test } from '@playwright/test';

const ADMIN_URL = process.env['E2E_ADMIN_URL'] ?? 'http://localhost:3009';

test.describe('admin review AI moderation', () => {
  test('shows an AI moderation recommendation for a review', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'lishop_session',
        value: '1',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.route('http://localhost:4000/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'admin-1',
            email: 'admin@lishop.test',
            role: 'ADMIN',
          },
        }),
      });
    });

    await page.route('http://localhost:4000/admin/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { orderCount: 0, revenueVnd: 0, userCount: 1, productCount: 1 },
        }),
      });
    });

    await page.route('http://localhost:4000/admin/reviews/*/ai-moderation', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            suggestedStatus: 'REJECTED',
            riskLevel: 'HIGH',
            summary: 'Review co dau hieu spam va link ngoai.',
            reasons: ['Chua duong link ben ngoai', 'Noi dung khong tap trung vao san pham'],
            fallback: false,
          },
        }),
      });
    });

    await page.route('http://localhost:4000/admin/reviews', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: '22222222-2222-2222-2222-222222222222',
              productId: 'product-1',
              userId: 'user-1',
              rating: 1,
              content: 'Vao http://spam.test de mua re hon',
              status: 'PENDING',
              verifiedPurchase: false,
              createdAt: '2026-06-06T00:00:00.000Z',
              product: { name: 'Ao khoac AI', slug: 'ao-khoac-ai' },
              user: {
                email: 'buyer@lishop.test',
                firstName: 'Buyer',
                lastName: 'Test',
              },
            },
          ],
        }),
      });
    });

    await page.route('http://localhost:4000/admin/reviews?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/reviews`, { waitUntil: 'networkidle' });

    await expect(page.getByText('Buyer Test')).toBeVisible();
    await page.getByRole('button', { name: 'AI kiem duyet' }).click();

    await expect(page.getByText(/Review co dau hieu spam/)).toBeVisible();
    await expect(page.getByText('Risk: HIGH')).toBeVisible();
    await expect(page.getByText('Chua duong link ben ngoai')).toBeVisible();
  });
});
