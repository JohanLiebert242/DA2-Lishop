import { expect, test } from '@playwright/test';

const ADMIN_URL = process.env['E2E_ADMIN_URL'] ?? 'http://localhost:3009';
const API_URL = 'http://localhost:4000';

test.describe('admin inventory management', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: 'lishop_session',
        value: '1',
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

  test('loads inventory list with stock levels', async ({ page }) => {
    await page.route(`${API_URL}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'admin-1', email: 'admin@lishop.test', role: 'ADMIN' } }) });
    });
    await page.route(`${API_URL}/admin/inventory`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'p1', name: 'Áo khoác premium', slug: 'ao-khoac-premium', stock: 15, weightGrams: 500, isLowStock: false, lastMovement: { type: 'IMPORT', delta: 10, createdAt: '2026-06-01T10:00:00Z' } }, { id: 'p2', name: 'Tai nghe Bluetooth', slug: 'tai-nghe-bluetooth', stock: 3, weightGrams: 200, isLowStock: true, lastMovement: null }] }) });
    });
    await page.goto(`${ADMIN_URL}/admin/inventory`, { waitUntil: 'networkidle' });
    await expect(page.getByText('Áo khoác premium')).toBeVisible();
    await expect(page.getByText('Tai nghe Bluetooth')).toBeVisible();
    await expect(page.getByText('Sắp hết')).toBeVisible();
    await expect(page.getByText('500g')).toBeVisible();
  });

  test('shows low stock count in metric cards', async ({ page }) => {
    await page.route(`${API_URL}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'admin-1', email: 'admin@lishop.test', role: 'ADMIN' } }) });
    });
    await page.route(`${API_URL}/admin/inventory`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'p1', name: 'Áo khoác premium', slug: 'ao-khoac-premium', stock: 3, weightGrams: 500, isLowStock: true, lastMovement: null }] }) });
    });
    await page.goto(`${ADMIN_URL}/admin/inventory`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/cảnh báo tồn/i).first()).toBeVisible();
    await expect(page.getByText(/1 sản phẩm/)).toBeVisible();
  });

  test('opens stock adjustment form', async ({ page }) => {
    await page.route(`${API_URL}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'admin-1', email: 'admin@lishop.test', role: 'ADMIN' } }) });
    });
    await page.route(`${API_URL}/admin/inventory`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'p1', name: 'Áo khoác premium', slug: 'ao-khoac-premium', stock: 15, weightGrams: 500, isLowStock: false, lastMovement: null }] }) });
    });
    await page.goto(`${ADMIN_URL}/admin/inventory`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /điều chỉnh/i }).click();
    await expect(page.getByText(/điều chỉnh tồn kho/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lưu' })).toBeVisible();
  });
});
