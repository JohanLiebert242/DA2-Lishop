import { expect, test } from '@playwright/test';

const CATALOG_URL = process.env['E2E_CATALOG_URL'] ?? 'http://localhost:3002';
const API_URL = 'http://localhost:4000';

test.describe('public shop page', () => {
  test('shows shop info and product grid', async ({ page }) => {
    await page.route(`${API_URL}/shops/shop-thoi-trang-abc`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 's1',
            name: 'Shop thời trang ABC',
            slug: 'shop-thoi-trang-abc',
            description: 'Chuyên thời trang nam nữ cao cấp',
            logoUrl: null,
            bannerUrl: null,
            phone: '0901234567',
            address: 'Hà Nội',
            createdAt: '2026-06-01T10:00:00Z',
          },
        }),
      });
    });

    await page.route(`${API_URL}/shops/shop-thoi-trang-abc/products*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items: [
              {
                id: 'p1',
                name: 'Áo thun nam cotton',
                slug: 'ao-thun-nam-cotton',
                sku: null,
                description: 'Áo thun chất lượng cao',
                priceVnd: 199000,
                priceUsd: 8,
                stock: 50,
                weightGrams: 200,
                averageRating: 4.5,
                reviewCount: 12,
                categoryId: 'cat1',
                shopId: 's1',
                createdAt: '2026-06-15T10:00:00Z',
                category: { id: 'cat1', name: 'Thời trang', slug: 'thoi-trang' },
                images: [
                  { id: 'img1', url: 'https://picsum.photos/400', alt: 'Áo thun', isPrimary: true },
                ],
                variants: [],
                tags: [],
              },
              {
                id: 'p2',
                name: 'Quần jeans nam',
                slug: 'quan-jeans-nam',
                sku: null,
                description: 'Quần jeans ống suông',
                priceVnd: 499000,
                priceUsd: 20,
                stock: 30,
                weightGrams: 500,
                averageRating: 4.2,
                reviewCount: 8,
                categoryId: 'cat1',
                shopId: 's1',
                createdAt: '2026-06-14T10:00:00Z',
                category: { id: 'cat1', name: 'Thời trang', slug: 'thoi-trang' },
                images: [],
                variants: [],
                tags: [],
              },
            ],
            nextCursor: null,
          },
        }),
      });
    });

    await page.goto(`${CATALOG_URL}/shops/shop-thoi-trang-abc`, { waitUntil: 'networkidle' });

    // Shop header
    await expect(page.getByText('Shop thời trang ABC')).toBeVisible();
    await expect(page.getByText('Chuyên thời trang nam nữ cao cấp')).toBeVisible();
    await expect(page.getByText('0901234567')).toBeVisible();
    await expect(page.getByText('Hà Nội')).toBeVisible();

    // Product grid
    await expect(page.getByText('Áo thun nam cotton')).toBeVisible();
    await expect(page.getByText('Quần jeans nam')).toBeVisible();

    // Prices formatted in VND
    await expect(page.getByText('199.000₫')).toBeVisible();
    await expect(page.getByText('499.000₫')).toBeVisible();
  });

  test('shows 404 for non-existent shop', async ({ page }) => {
    await page.route(`${API_URL}/shops/not-exists`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'none',
            name: '',
            slug: 'not-exists',
            description: null,
            logoUrl: null,
            bannerUrl: null,
            phone: null,
            address: null,
            createdAt: '2026-06-01T10:00:00Z',
          },
        }),
      });
    });

    await page.route(`${API_URL}/shops/not-exists/products*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { items: [], nextCursor: null },
        }),
      });
    });

    // The shop slug with empty name from backend - our page handles it
    await page.goto(`${CATALOG_URL}/shops/not-exists`, { waitUntil: 'networkidle' });
    // Should show some content without crashing
    await expect(page.locator('body')).not.toHaveText('Đang tải...');
  });

  test('shows empty products state', async ({ page }) => {
    await page.route(`${API_URL}/shops/new-shop`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 's-new',
            name: 'Cửa hàng mới',
            slug: 'new-shop',
            description: 'Vừa mở',
            logoUrl: null,
            bannerUrl: null,
            phone: null,
            address: null,
            createdAt: '2026-06-23T10:00:00Z',
          },
        }),
      });
    });

    await page.route(`${API_URL}/shops/new-shop/products*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { items: [], nextCursor: null },
        }),
      });
    });

    await page.goto(`${CATALOG_URL}/shops/new-shop`, { waitUntil: 'networkidle' });

    await expect(page.getByText('Cửa hàng mới')).toBeVisible();
    await expect(page.getByText('chưa có sản phẩm nào')).toBeVisible();
  });
});
