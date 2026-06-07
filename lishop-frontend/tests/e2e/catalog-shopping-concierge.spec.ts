import { expect, test } from '@playwright/test';

const CATALOG_URL = process.env['E2E_CATALOG_URL'] ?? 'http://localhost:3002';

test.describe('catalog AI shopping concierge', () => {
  test('shows a cart plan and lets the shopper add all suggestions', async ({ page, context }) => {
    let addCartCalls = 0;

    await page.route('**/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.route('**/products?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: [], nextCursor: null } }),
      });
    });

    await page.route('**/products/recommendations**', async (route) => {
      if (route.request().resourceType() === 'document') return route.fallback();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            fallback: false,
            reason: 'Gợi ý phù hợp cho khách đang khám phá danh mục.',
            items: [],
          },
        }),
      });
    });

    await page.route('**/shopping/concierge', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            reply: 'Mình đã tạo một combo đi làm nằm trong ngân sách.',
            items: [
              {
                id: '11111111-1111-1111-1111-111111111111',
                name: 'Áo khoác đi làm',
                slug: 'ao-khoac-di-lam',
                description: 'Áo khoác gọn gàng.',
                priceVnd: 450000,
                stock: 5,
                averageRating: 4.7,
                reviewCount: 12,
                imageUrl: 'https://example.com/a.jpg',
              },
            ],
            cartPlan: [
              {
                productId: '11111111-1111-1111-1111-111111111111',
                name: 'Áo khoác đi làm',
                slug: 'ao-khoac-di-lam',
                quantity: 1,
                priceVnd: 450000,
                imageUrl: 'https://example.com/a.jpg',
                reason: 'Phù hợp với môi trường công sở.',
              },
            ],
            actions: [{ type: 'ADD_TO_CART', label: 'Thêm combo vào giỏ' }],
            fallback: false,
          },
        }),
      });
    });

    await page.route('**/cart/items', async (route) => {
      addCartCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items: [{ productId: '11111111-1111-1111-1111-111111111111', quantity: 1 }],
          },
        }),
      });
    });

    await page.goto(`${CATALOG_URL}/products`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/products$/);

    const conciergeToggle = page.getByRole('button', { name: 'Mở trợ lý mua sắm AI' });
    await expect(conciergeToggle).toBeVisible();
    await conciergeToggle.click();
    await expect(page.getByTestId('shopping-concierge')).toBeVisible();
    await page.getByPlaceholder('Mô tả nhu cầu mua sắm...').fill('Tôi cần combo đi làm dưới 1 triệu');
    await page.getByRole('button', { name: 'Gửi yêu cầu' }).click();

    await expect(page.getByText(/combo đi làm nằm trong ngân sách/i)).toBeVisible();
    await expect(page.getByText('Giỏ hàng gợi ý', { exact: true })).toBeVisible();
    await expect(page.getByText('Áo khoác đi làm')).toBeVisible();

    await context.addCookies([
      {
        name: 'lishop_session',
        value: '1',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.getByTestId('concierge-add-all').click();
    await expect(page.getByText(/Đã thêm 1 sản phẩm gợi ý vào giỏ/)).toBeVisible();
    expect(addCartCalls).toBe(1);
  });
});
