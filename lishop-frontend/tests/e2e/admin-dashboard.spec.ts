import { expect, test } from '@playwright/test';

const ADMIN_URL = process.env['E2E_ADMIN_URL'] ?? 'http://localhost:3009';

test.describe('admin dashboard', () => {
  test('loads /admin as a dashboard instead of redirecting to orders', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'lishop_session',
        value: '1',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.route('**/auth/me', async (route) => {
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

    await page.route('**/admin/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            orderCount: 42,
            revenueVnd: 125000000,
            userCount: 320,
            productCount: 86,
          },
        }),
      });
    });

    await page.route('**/admin/analytics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            summary: {
              revenueVnd: 125000000,
              orderCount: 42,
              averageOrderValueVnd: 2976190,
              newUsers: 18,
            },
            dailyRevenue: [{ date: '2026-06-06', amount: 5200000 }],
            topProducts: [{ productId: 'p1', productName: 'Ao khoac premium', revenue: 18500000 }],
            orderStatusBreakdown: [
              { status: 'PENDING', count: 8 },
              { status: 'DELIVERED', count: 21 },
            ],
            lowStockProducts: [{ id: 'p-low', name: 'Ao khoac premium', slug: 'ao-khoac-premium', stock: 3 }],
          },
        }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin`, { waitUntil: 'networkidle' });

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: /bảng điều khiển/i })).toBeVisible();
    await expect(page.getByText(/Ao khoac premium/)).toBeVisible();
    await expect(page.getByRole('heading', { name: /điểm cần chú ý/i })).toBeVisible();
  });
});
