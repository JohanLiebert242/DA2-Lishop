import { expect, test } from '@playwright/test';

const ADMIN_URL = process.env['E2E_ADMIN_URL'] ?? 'http://localhost:3009';
const API_URL = 'http://localhost:4000';

test.describe('admin users & wallets', () => {
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

  test('loads users list with role management', async ({ page }) => {
    await page.route(`${API_URL}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'admin-1', email: 'admin@lishop.test', role: 'ADMIN' } }) });
    });
    await page.route(`${API_URL}/admin/users`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'u1', email: 'customer@test.com', firstName: 'Nguyen', lastName: 'Van A', role: 'CUSTOMER', loyaltyPoints: 120, createdAt: '2026-01-15T10:00:00Z' }, { id: 'u2', email: 'admin2@lishop.test', firstName: 'Tran', lastName: 'Thi B', role: 'ADMIN', loyaltyPoints: 0, createdAt: '2025-06-01T10:00:00Z' }] }) });
    });
    await page.goto(`${ADMIN_URL}/admin/users`, { waitUntil: 'networkidle' });
    await expect(page.getByText('customer@test.com')).toBeVisible();
    await expect(page.getByText('admin2@lishop.test')).toBeVisible();
    await expect(page.getByText('120')).toBeVisible();
  });

  test('loads wallets list with balances', async ({ page }) => {
    await page.route(`${API_URL}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'admin-1', email: 'admin@lishop.test', role: 'ADMIN' } }) });
    });
    await page.route(`${API_URL}/admin/wallets`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'w1', userId: 'u1', balanceVnd: 500000, createdAt: '2026-01-15T10:00:00Z', updatedAt: '2026-06-10T10:00:00Z', user: { email: 'customer@test.com', firstName: 'Nguyen', lastName: 'Van A' } }, { id: 'w2', userId: 'u2', balanceVnd: 1250000, createdAt: '2025-06-01T10:00:00Z', updatedAt: '2026-06-15T10:00:00Z', user: { email: 'vip@test.com', firstName: 'Le', lastName: 'Thi C' } }] }) });
    });
    await page.goto(`${ADMIN_URL}/admin/wallets`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/2 ví người dùng/)).toBeVisible();
    await expect(page.getByText('customer@test.com')).toBeVisible();
    await expect(page.getByText(/500\.000/)).toBeVisible();
    await expect(page.getByText(/1\.250\.000/)).toBeVisible();
  });

  test('loads wallet topups with approve/reject actions', async ({ page }) => {
    await page.route(`${API_URL}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'admin-1', email: 'admin@lishop.test', role: 'ADMIN' } }) });
    });
    await page.route(`${API_URL}/admin/wallet-topups`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'topup1', userId: 'u1', walletId: 'w1', amountVnd: 200000, status: 'PENDING', transferCode: 'CK-001', bankName: 'Vietcombank', bankAccountNumber: '0123456789', bankAccountName: 'NGUYEN VAN A', adminNote: null, reviewedById: null, reviewedAt: null, createdAt: '2026-06-15T10:00:00Z', updatedAt: '2026-06-15T10:00:00Z', user: { email: 'customer@test.com', firstName: 'Nguyen', lastName: 'Van A' } }, { id: 'topup2', userId: 'u2', walletId: 'w2', amountVnd: 500000, status: 'APPROVED', transferCode: 'CK-002', bankName: 'Techcombank', bankAccountNumber: '9876543210', bankAccountName: 'LE THI C', adminNote: 'Đã nhận tiền', reviewedById: 'admin-1', reviewedAt: '2026-06-16T10:00:00Z', createdAt: '2026-06-14T10:00:00Z', updatedAt: '2026-06-16T10:00:00Z', user: { email: 'vip@test.com', firstName: 'Le', lastName: 'Thi C' } }] }) });
    });
    await page.goto(`${ADMIN_URL}/admin/wallet-topups`, { waitUntil: 'networkidle' });
    await expect(page.getByText('CK-001')).toBeVisible();
    await expect(page.getByText('CK-002')).toBeVisible();
    await expect(page.getByText(/chờ đối soát/i)).toBeVisible();
    await expect(page.getByText(/đã cộng ví/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /duyệt/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /từ chối/i })).toBeVisible();
  });
});
