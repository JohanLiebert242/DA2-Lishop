import { expect, test } from '@playwright/test';

const ADMIN_URL = process.env['E2E_ADMIN_URL'] ?? 'http://localhost:3009';
const API_URL = 'http://localhost:4000';

test.describe('admin orders management', () => {
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

  test('loads orders list with pagination', async ({ page }) => {
    await page.route(`${API_URL}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'admin-1', email: 'admin@lishop.test', role: 'ADMIN' } }) });
    });
    await page.route(`${API_URL}/admin/orders?page=1&limit=50`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { orders: [{ id: 'o1', orderNumber: 'ORD-001', status: 'PENDING', totalVnd: 250000, createdAt: '2026-06-01T10:00:00Z', itemCount: 3, user: { email: 'a@b.com', firstName: 'Nguyen', lastName: 'Van A' } }, { id: 'o2', orderNumber: 'ORD-002', status: 'SHIPPED', totalVnd: 180000, createdAt: '2026-06-02T10:00:00Z', itemCount: 1, user: { email: 'b@c.com', firstName: 'Tran', lastName: 'Thi B' } }], total: 25 } }) });
    });
    await page.goto(`${ADMIN_URL}/admin/orders`, { waitUntil: 'networkidle' });
    await expect(page.getByText('#ORD-001')).toBeVisible();
    await expect(page.getByText('#ORD-002')).toBeVisible();
    await expect(page.getByText(/25 đơn hàng/)).toBeVisible();
    await expect(page.getByText(/giá trị trang/i)).toBeVisible();
  });

  test('changes order status via dropdown', async ({ page }) => {
    let updatedStatus = '';
    await page.route(`${API_URL}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'admin-1', email: 'admin@lishop.test', role: 'ADMIN' } }) });
    });
    await page.route(`${API_URL}/admin/orders?page=1&limit=50`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { orders: [{ id: 'o1', orderNumber: 'ORD-001', status: 'PENDING', totalVnd: 250000, createdAt: '2026-06-01T10:00:00Z', itemCount: 3, user: { email: 'a@b.com', firstName: 'Nguyen', lastName: 'Van A' } }], total: 1 } }) });
    });
    await page.route(`${API_URL}/admin/orders/*/status`, async (route) => {
      const body = JSON.parse(route.request().postData() ?? '{}');
      updatedStatus = body.status;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'o1', status: body.status } }) });
    });
    await page.goto(`${ADMIN_URL}/admin/orders`, { waitUntil: 'networkidle' });
    await page.selectOption('select', 'PROCESSING');
    await page.waitForTimeout(1000);
    expect(updatedStatus).toBe('PROCESSING');
  });

  test('shows handoff button for PROCESSING orders', async ({ page }) => {
    await page.route(`${API_URL}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'admin-1', email: 'admin@lishop.test', role: 'ADMIN' } }) });
    });
    await page.route(`${API_URL}/admin/orders?page=1&limit=50`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { orders: [{ id: 'o1', orderNumber: 'ORD-001', status: 'PROCESSING', totalVnd: 250000, createdAt: '2026-06-01T10:00:00Z', itemCount: 3, user: { email: 'a@b.com', firstName: 'Nguyen', lastName: 'Van A' } }], total: 1 } }) });
    });
    await page.goto(`${ADMIN_URL}/admin/orders`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('button', { name: /bàn giao/i })).toBeVisible();
  });
});
