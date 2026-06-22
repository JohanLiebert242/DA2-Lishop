import { expect, test } from '@playwright/test';

const ADMIN_URL = process.env['E2E_ADMIN_URL'] ?? 'http://localhost:3009';
const API_URL = 'http://localhost:4000';

test.describe('admin products CRUD', () => {
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

  test('loads products list and shows product count', async ({ page }) => {
    await page.route(`${API_URL}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'admin-1', email: 'admin@lishop.test', role: 'ADMIN' } }) });
    });
    await page.route(`${API_URL}/products?limit=1000`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [{ id: 'p1', name: 'Áo khoác premium', slug: 'ao-khoac-premium', sku: null, description: 'Áo cao cấp', priceVnd: 499000, priceUsd: 2000, stock: 15, weightGrams: 500, averageRating: 4.5, reviewCount: 10, categoryId: 'cat1', category: { id: 'cat1', name: 'Thời trang', slug: 'thoi-trang' }, images: [{ id: 'img1', url: '/uploads/p1.jpg', alt: 'Áo khoác', isPrimary: true }], createdAt: '2026-06-01T10:00:00Z' }], nextCursor: null } }) });
    });
    await page.goto(`${ADMIN_URL}/admin/products`, { waitUntil: 'networkidle' });
    await expect(page.getByText('Áo khoác premium')).toBeVisible();
    await expect(page.getByText(/1 sản phẩm/)).toBeVisible();
    await expect(page.getByText(/499\.000/)).toBeVisible();
  });

  test('opens product modal with categories', async ({ page }) => {
    await page.route(`${API_URL}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'admin-1', email: 'admin@lishop.test', role: 'ADMIN' } }) });
    });
    await page.route(`${API_URL}/products?limit=1000`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [], nextCursor: null } }) });
    });
    await page.route(`${API_URL}/categories`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'cat1', name: 'Thời trang', slug: 'thoi-trang', parentId: null }] }) });
    });
    await page.goto(`${ADMIN_URL}/admin/products`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /thêm sản phẩm/i }).click();
    await expect(page.getByText('Thêm sản phẩm mới')).toBeVisible();
    await expect(page.getByRole('combobox')).toContainText('Thời trang');
  });

  test('searches products client-side', async ({ page }) => {
    await page.route(`${API_URL}/auth/me`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'admin-1', email: 'admin@lishop.test', role: 'ADMIN' } }) });
    });
    await page.route(`${API_URL}/products?limit=1000`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [{ id: 'p1', name: 'Áo khoác premium', slug: 'ao-khoac-premium', description: 'Áo cao cấp', priceVnd: 499000, priceUsd: 2000, stock: 15, weightGrams: 500, averageRating: 4.5, reviewCount: 10, categoryId: 'cat1', category: { id: 'cat1', name: 'Thời trang', slug: 'thoi-trang' }, images: [], createdAt: '2026-06-01T10:00:00Z' }, { id: 'p2', name: 'Tai nghe Bluetooth', slug: 'tai-nghe-bluetooth', description: 'Tai nghe không dây', priceVnd: 799000, priceUsd: 3200, stock: 8, weightGrams: 200, averageRating: 4.2, reviewCount: 5, categoryId: 'cat2', category: { id: 'cat2', name: 'Điện tử', slug: 'dien-tu' }, images: [], createdAt: '2026-06-01T10:00:00Z' }], nextCursor: null } }) });
    });
    await page.goto(`${ADMIN_URL}/admin/products`, { waitUntil: 'networkidle' });
    await page.getByPlaceholder('Tìm sản phẩm...').fill('Áo khoác');
    await expect(page.getByText('Áo khoác premium')).toBeVisible();
    await expect(page.getByText('Tai nghe Bluetooth')).not.toBeVisible();
  });
});
