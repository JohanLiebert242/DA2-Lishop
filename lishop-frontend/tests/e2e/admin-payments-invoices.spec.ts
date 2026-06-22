import { expect, test } from '@playwright/test';

const ADMIN_URL = process.env['E2E_ADMIN_URL'] ?? 'http://localhost:3009';
const API_URL = 'http://localhost:4000';

test.describe('admin payments & invoices', () => {
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

  test('loads payments list with COD confirmation button', async ({ page }) => {
    await page.route(`${API_URL}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'admin-1', email: 'admin@lishop.test', role: 'ADMIN' } }) });
    });
    await page.route(`${API_URL}/admin/payments`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'pay1', orderId: 'o1', method: 'COD', amountVnd: 250000, status: 'PENDING', providerRef: null, invoiceUrl: null, createdAt: '2026-06-01T10:00:00Z', updatedAt: '2026-06-01T10:00:00Z', order: { orderNumber: 'ORD-001', userId: 'u1', user: { email: 'a@b.com', firstName: 'Nguyen', lastName: 'Van A' } } }, { id: 'pay2', orderId: 'o2', method: 'VNPAY', amountVnd: 180000, status: 'COMPLETED', providerRef: 'vnpay123', invoiceUrl: null, createdAt: '2026-06-02T10:00:00Z', updatedAt: '2026-06-02T10:00:00Z', order: { orderNumber: 'ORD-002', userId: 'u2', user: { email: 'b@c.com', firstName: '', lastName: '' } } }] }) });
    });
    await page.goto(`${ADMIN_URL}/admin/payments`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/2 giao dịch/)).toBeVisible();
    await expect(page.getByText('#ORD-001')).toBeVisible();
    await expect(page.getByText('Tiền mặt (COD)')).toBeVisible();
    await expect(page.getByRole('button', { name: /xác nhận tiền mặt/i })).toBeVisible();
    await expect(page.getByText('VNPay')).toBeVisible();
  });

  test('loads invoices list', async ({ page }) => {
    await page.route(`${API_URL}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'admin-1', email: 'admin@lishop.test', role: 'ADMIN' } }) });
    });
    await page.route(`${API_URL}/admin/invoices`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'inv1', orderId: 'o1', invoiceNo: 'INV-2026-001', billingName: 'Nguyen Van A', billingEmail: 'a@b.com', billingAddress: '123 Street', billingPhone: '0909123456', subtotalVnd: 250000, discountVnd: 0, shippingFeeVnd: 30000, vatPercent: 8, vatVnd: 22400, totalVnd: 302400, issuedAt: '2026-06-01T10:00:00Z' }] }) });
    });
    await page.goto(`${ADMIN_URL}/admin/invoices`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/1 hóa đơn/)).toBeVisible();
    await expect(page.getByText('INV-2026-001')).toBeVisible();
    await expect(page.getByText('Nguyen Van A')).toBeVisible();
    await expect(page.getByRole('button', { name: /tạo lại/i })).toBeVisible();
  });

  test('confirms COD payment', async ({ page }) => {
    let confirmCalled = false;
    await page.route(`${API_URL}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'admin-1', email: 'admin@lishop.test', role: 'ADMIN' } }) });
    });
    await page.route(`${API_URL}/admin/payments`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'pay1', orderId: 'o1', method: 'COD', amountVnd: 250000, status: 'PENDING', providerRef: null, invoiceUrl: null, createdAt: '2026-06-01T10:00:00Z', updatedAt: '2026-06-01T10:00:00Z', order: { orderNumber: 'ORD-001', userId: 'u1', user: { email: 'a@b.com', firstName: 'Nguyen', lastName: 'Van A' } } }] }) });
    });
    await page.route(`${API_URL}/admin/payments/*/confirm`, async (route) => {
      confirmCalled = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'pay1', status: 'COMPLETED' } }) });
    });
    await page.goto(`${ADMIN_URL}/admin/payments`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /xác nhận tiền mặt/i }).click();
    await expect(confirmCalled).toBeTruthy();
  });
});
