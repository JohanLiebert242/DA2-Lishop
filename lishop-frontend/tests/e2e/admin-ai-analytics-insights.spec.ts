import { expect, test } from '@playwright/test';

const ADMIN_URL = process.env['E2E_ADMIN_URL'] ?? 'http://localhost:3009';

test.describe('admin AI analytics insights', () => {
  test('generates and displays AI insights from analytics data', async ({ page, context }) => {
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
          data: { orderCount: 10, revenueVnd: 5000000, userCount: 4, productCount: 3 },
        }),
      });
    });

    await page.route('http://localhost:4000/admin/analytics/ai-insights', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            highlights: ['Doanh thu 30 ngay dang co tin hieu tot.'],
            risks: ['Mot san pham sap het hang.'],
            actions: [
              { title: 'Bo sung ton kho', rationale: 'Giam nguy co mat doanh thu.' },
            ],
            questions: ['Kenh nao dang tao don hang tot nhat?'],
            fallback: false,
          },
        }),
      });
    });

    await page.route('http://localhost:4000/admin/analytics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            summary: {
              revenueVnd: 5000000,
              orderCount: 10,
              averageOrderValueVnd: 500000,
              newUsers: 4,
            },
            dailyRevenue: [{ date: '2026-06-06', amount: 500000 }],
            topProducts: [{ productId: 'p1', productName: 'Ao khoac AI', revenue: 500000 }],
            orderStatusBreakdown: [
              { status: 'PENDING', count: 2 },
              { status: 'PROCESSING', count: 2 },
              { status: 'SHIPPED', count: 1 },
              { status: 'DELIVERED', count: 4 },
              { status: 'CANCELLED', count: 1 },
              { status: 'REFUNDED', count: 0 },
            ],
            lowStockProducts: [{ id: 'low-1', name: 'Ao sap het', slug: 'ao-sap-het', stock: 3 }],
          },
        }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/analytics`, { waitUntil: 'networkidle' });

    const panel = page.getByTestId('admin-analytics-ai');
    await expect(panel).toBeVisible();
    await page.getByTestId('admin-analytics-ai-run').click();

    await expect(panel.getByText(/Doanh thu 30 ngay dang co tin hieu tot/)).toBeVisible();
    await expect(panel.getByText('Bo sung ton kho')).toBeVisible();
    await expect(panel.getByText('Kenh nao dang tao don hang tot nhat?')).toBeVisible();
  });
});
