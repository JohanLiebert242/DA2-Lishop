import { expect, test } from '@playwright/test';

const ADMIN_URL = process.env['E2E_ADMIN_URL'] ?? 'http://localhost:3009';
const API_URL = 'http://localhost:4000';

test.describe('admin shops management', () => {
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

  const mockAuth = (page: any) =>
    page.route(`${API_URL}/auth/me`, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { id: 'admin-1', email: 'admin@lishop.test', role: 'ADMIN' },
        }),
      });
    });

  test('shows empty state when no shops exist', async ({ page }) => {
    await mockAuth(page);
    await page.route(`${API_URL}/admin/shops`, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/shops`, { waitUntil: 'networkidle' });

    await expect(page.getByText('Cửa hàng')).toBeVisible();
    await expect(page.getByText('Quản lý cửa hàng của người bán')).toBeVisible();
  });

  test('displays shop list with status badges', async ({ page }) => {
    await mockAuth(page);
    await page.route(`${API_URL}/admin/shops`, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 's1',
              name: 'Shop thời trang ABC',
              slug: 'shop-thoi-trang-abc',
              description: 'Chuyên thời trang nam',
              logoUrl: null,
              bannerUrl: null,
              phone: '0901234567',
              address: 'Hà Nội',
              status: 'PENDING',
              userId: 'u1',
              approvedAt: null,
              approvedById: null,
              rejectionReason: null,
              createdAt: '2026-06-20T10:00:00Z',
              user: { id: 'u1', email: 'seller@test.com', firstName: 'Nguyễn', lastName: 'Văn A', avatarUrl: null },
              approvedBy: null,
              _count: { products: 0 },
            },
            {
              id: 's2',
              name: 'Điện tử Gia dụng XYZ',
              slug: 'dien-tu-gia-dung-xyz',
              description: null,
              logoUrl: null,
              bannerUrl: null,
              phone: null,
              address: null,
              status: 'APPROVED',
              userId: 'u2',
              approvedAt: '2026-06-21T08:00:00Z',
              approvedById: 'admin-1',
              rejectionReason: null,
              createdAt: '2026-06-19T10:00:00Z',
              user: { id: 'u2', email: 'seller2@test.com', firstName: 'Trần', lastName: 'Thị B', avatarUrl: null },
              approvedBy: { id: 'admin-1', firstName: 'Admin', lastName: 'System' },
              _count: { products: 5 },
            },
          ],
        }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/shops`, { waitUntil: 'networkidle' });

    await expect(page.getByText('Shop thời trang ABC')).toBeVisible();
    await expect(page.getByText('Điện tử Gia dụng XYZ')).toBeVisible();
    await expect(page.getByText('Nguyễn Văn A')).toBeVisible();
    await expect(page.getByText('Trần Thị B')).toBeVisible();

    // Status badges
    await expect(page.getByText('Chờ duyệt')).toBeVisible();
    await expect(page.getByText('Đã duyệt')).toBeVisible();
  });

  test('filters shops by status tab', async ({ page }) => {
    await mockAuth(page);

    let capturedUrl = '';
    await page.route(`${API_URL}/admin/shops*`, async (route: any) => {
      capturedUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/shops`, { waitUntil: 'networkidle' });

    // Click "Chờ duyệt" tab
    await page.getByRole('button', { name: 'Chờ duyệt' }).click();
    await page.waitForTimeout(300);

    expect(capturedUrl).toContain('status=PENDING');
  });

  test('approve button triggers API call', async ({ page }) => {
    await mockAuth(page);

    let approveRequested = false;
    await page.route(`${API_URL}/admin/shops`, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 's-pending',
              name: 'Cần duyệt',
              slug: 'can-duyet',
              description: null,
              logoUrl: null,
              bannerUrl: null,
              phone: null,
              address: null,
              status: 'PENDING',
              userId: 'u1',
              approvedAt: null,
              approvedById: null,
              rejectionReason: null,
              createdAt: '2026-06-22T10:00:00Z',
              user: { id: 'u1', email: 'seller@test.com', firstName: 'Seller', lastName: 'One', avatarUrl: null },
              approvedBy: null,
              _count: { products: 0 },
            },
          ],
        }),
      });
    });

    await page.route(`${API_URL}/admin/shops/s-pending/approve`, async (route: any) => {
      approveRequested = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 's-pending',
            name: 'Cần duyệt',
            status: 'APPROVED',
            _count: { products: 0 },
            user: { email: 'seller@test.com', firstName: 'Seller', lastName: 'One' },
          },
        }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/shops`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Find and click the approve button (first green button)
    const approveBtn = page.locator('button.bg-green-600').first();
    await approveBtn.click();
    await page.waitForTimeout(500);

    expect(approveRequested).toBe(true);
  });

  test('reject button opens reject modal', async ({ page }) => {
    await mockAuth(page);

    await page.route(`${API_URL}/admin/shops`, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 's-pending',
              name: 'Cần từ chối',
              slug: 'can-tu-choi',
              description: null,
              logoUrl: null,
              bannerUrl: null,
              phone: null,
              address: null,
              status: 'PENDING',
              userId: 'u1',
              approvedAt: null,
              approvedById: null,
              rejectionReason: null,
              createdAt: '2026-06-22T10:00:00Z',
              user: { id: 'u1', email: 'seller@test.com', firstName: 'Seller', lastName: 'One', avatarUrl: null },
              approvedBy: null,
              _count: { products: 0 },
            },
          ],
        }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/shops`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Click reject button (second button in the pending row with bg-red-100)
    const rejectBtn = page.locator('button.bg-red-100').first();
    await rejectBtn.click();

    await expect(page.getByText('Từ chối cửa hàng')).toBeVisible();
    await expect(page.getByText('Cần từ chối')).toBeVisible();
    await expect(page.getByPlaceholder('Lý do từ chối')).toBeVisible();
  });
});
