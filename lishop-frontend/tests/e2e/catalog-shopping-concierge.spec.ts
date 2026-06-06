import { expect, test } from '@playwright/test';

const CATALOG_URL = process.env['E2E_CATALOG_URL'] ?? 'http://localhost:3002';

test.describe('catalog AI shopping concierge', () => {
  test('shows a cart plan and lets the shopper add all suggestions', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'lishop_session',
        value: '1',
        domain: 'localhost',
        path: '/',
      },
    ]);

    let addCartCalls = 0;

    await page.route('http://localhost:4000/categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.route('http://localhost:4000/products?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: [], nextCursor: null } }),
      });
    });

    await page.route('http://localhost:4000/shopping/concierge', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            reply: 'Minh da tao mot combo di lam nam trong ngan sach.',
            items: [
              {
                id: '11111111-1111-1111-1111-111111111111',
                name: 'Ao khoac di lam',
                slug: 'ao-khoac-di-lam',
                description: 'Ao khoac gon gang.',
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
                name: 'Ao khoac di lam',
                slug: 'ao-khoac-di-lam',
                quantity: 1,
                priceVnd: 450000,
                imageUrl: 'https://example.com/a.jpg',
                reason: 'Phu hop voi moi truong cong so.',
              },
            ],
            actions: [{ type: 'ADD_TO_CART', label: 'Them combo vao gio' }],
            fallback: false,
          },
        }),
      });
    });

    await page.route('http://localhost:4000/cart/items', async (route) => {
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

    await page.getByRole('button', { name: 'Mo AI Shopping Concierge' }).click();
    await expect(page.getByTestId('shopping-concierge')).toBeVisible();
    await page.getByPlaceholder('Mo ta nhu cau mua sam...').fill('Toi can combo di lam duoi 1 trieu');
    await page.getByRole('button', { name: 'Gui yeu cau' }).click();

    await expect(page.getByText(/combo di lam nam trong ngan sach/)).toBeVisible();
    await expect(page.getByText('Gio hang goi y', { exact: true })).toBeVisible();
    await expect(page.getByText('Ao khoac di lam')).toBeVisible();

    await page.getByTestId('concierge-add-all').click();
    await expect(page.getByText(/Da them 1 san pham goi y vao gio/)).toBeVisible();
    expect(addCartCalls).toBe(1);
  });
});
