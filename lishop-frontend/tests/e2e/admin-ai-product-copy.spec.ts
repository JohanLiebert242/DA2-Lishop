import { expect, test } from '@playwright/test';

const ADMIN_URL = process.env['E2E_ADMIN_URL'] ?? 'http://localhost:3009';

test.describe('admin AI product copy', () => {
  test('writes generated product description into the product modal', async ({ page, context }) => {
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

    await page.route('**/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'cat-1', name: 'Thoi trang', slug: 'thoi-trang', parentId: null },
          ],
        }),
      });
    });

    await page.route('**/admin/products/ai-copy', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            description: 'Ao khoac AI co form gon, de phoi do va phu hop su dung hang ngay.',
            fallback: false,
          },
        }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/products`, { waitUntil: 'networkidle' });

    const addProduct = page.getByRole('button', { name: /Thêm sản phẩm/i });
    await expect(addProduct).toBeVisible();
    await addProduct.click();
    const dialog = page.locator('.fixed.inset-0').last();
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder('Tên sản phẩm...').fill('Ao khoac AI');
    await dialog.getByRole('button', { name: 'AI viet mo ta' }).click();

    const description = dialog.getByPlaceholder('Mô tả sản phẩm...');
    await expect(description).toHaveValue(/Ao khoac AI co form gon/);
    await expect(dialog.getByText(/AI da tao mo ta/)).toBeVisible();
  });
});
