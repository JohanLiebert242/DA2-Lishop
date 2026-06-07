import { expect, test } from '@playwright/test';

const ADMIN_URL = process.env['E2E_ADMIN_URL'] ?? 'http://localhost:3009';

test.describe('admin AI product import/enrich', () => {
  test('analyzes raw text into products and imports them', async ({ page, context }) => {
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
          data: { orderCount: 0, revenueVnd: 0, userCount: 0, productCount: 0 },
        }),
      });
    });

    await page.route('**/products?limit=100', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: [], nextCursor: null } }),
      });
    });

    await page.route('**/admin/products/ai-import-enrich', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            fallback: false,
            products: [
              { name: 'Ao AI', description: 'Mo ta ngan.', priceVnd: 199000, priceUsd: 799, stock: 10, weightGrams: 200 },
            ],
          },
        }),
      });
    });

    await page.route('**/admin/products/import', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: { created: 1, failed: 0, errors: [] } }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/products`, { waitUntil: 'networkidle' });

    const open = page.getByRole('button', { name: /ai nhập liệu nâng cao/i });
    await expect(open).toBeVisible();
    await open.click();

    const dialog = page.locator('.fixed.inset-0').last();
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder(/Danh sách sản phẩm/i).fill('Ao AI gia 199k ton 10');
    await dialog.getByRole('button', { name: /AI phân tích/i }).click();

    await expect(dialog.getByText(/Đã chuẩn bị 1 sản phẩm/i)).toBeVisible();
    await dialog.getByRole('button', { name: /^Nhập$/ }).click();
    await expect(dialog.getByText(/Tạo thành công 1/i)).toBeVisible();
  });
});
