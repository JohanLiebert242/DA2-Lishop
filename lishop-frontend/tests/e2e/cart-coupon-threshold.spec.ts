import { expect, test } from '@playwright/test';

const CART_URL = process.env['E2E_CART_URL'] ?? 'http://localhost:3003';
const API_CART_ROUTE = /^https?:\/\/(?:127\.0\.0\.1|localhost):4000\/cart(?:\?.*)?$/;
const API_CART_COUPON_ROUTE = /^https?:\/\/(?:127\.0\.0\.1|localhost):4000\/cart\/coupon(?:\?.*)?$/;
const API_CART_ITEMS_ROUTE = /^https?:\/\/(?:127\.0\.0\.1|localhost):4000\/cart\/items\/.+$/;

test.describe('cart coupon minimum order', () => {
  test('blocks applying coupon below minimum and removes it after subtotal drops', async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'lishop_session',
        value: '1',
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        sameSite: 'Lax',
      },
    ]);

    let cartState = {
      items: [
        {
          id: 'ci-1',
          productId: 'p-1',
          productName: 'Laptop Pro 14',
          productSlug: 'laptop-pro-14',
          imageUrl: null,
          variantId: null,
          variantName: null,
          variantSku: null,
          variantAttributes: null,
          quantity: 2,
          priceVnd: 600000,
          priceUsd: 24,
          stock: 10,
        },
      ],
      subtotalVnd: 1200000,
      subtotalUsd: 48,
      couponCode: 'SAVE10',
      discountVnd: 120000,
      totalVnd: 1080000,
    };

    const syncTotals = () => {
      const subtotalVnd = cartState.items.reduce((sum, item) => sum + item.priceVnd * item.quantity, 0);
      cartState = {
        ...cartState,
        subtotalVnd,
        subtotalUsd: Math.floor(subtotalVnd / 25000),
        ...(subtotalVnd >= 1000000
          ? {
              couponCode: 'SAVE10',
              discountVnd: Math.floor(subtotalVnd * 0.1),
              totalVnd: subtotalVnd - Math.floor(subtotalVnd * 0.1),
            }
          : {
              couponCode: null,
              discountVnd: 0,
              totalVnd: subtotalVnd,
            }),
      };
    };

    await page.route(API_CART_ROUTE, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: cartState }),
      });
    });

    await page.route(API_CART_COUPON_ROUTE, async (route, request) => {
      if (request.method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Don hang toi thieu 1.000.000d de dung ma nay',
          }),
        });
        return;
      }

      cartState = {
        ...cartState,
        couponCode: null,
        discountVnd: 0,
        totalVnd: cartState.subtotalVnd,
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: cartState }),
      });
    });

    await page.route(API_CART_ITEMS_ROUTE, async (route, request) => {
      if (request.method() !== 'PATCH') {
        await route.fallback();
        return;
      }

      const body = request.postDataJSON() as { quantity: number };
      cartState.items = cartState.items.map((item) =>
        item.productId === 'p-1' ? { ...item, quantity: body.quantity } : item,
      );
      syncTotals();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: cartState }),
      });
    });

    await page.goto(`${CART_URL}/cart`);

    await expect(page.getByText('SAVE10')).toBeVisible();
    await expect(page.getByText(/120\.000/).first()).toBeVisible();

    await page.getByRole('button', { name: '−' }).click();
    await expect(page.getByText('SAVE10')).toHaveCount(0);
    await expect(page.getByText(/600\.000/).first()).toBeVisible();
    const couponInput = page.locator('input[type="text"]').first();
    await expect(couponInput).toBeVisible();

    await couponInput.fill('save10');
    await couponInput.locator('xpath=following-sibling::button[1]').click();
    await expect(page.getByText('Don hang toi thieu 1.000.000d de dung ma nay')).toBeVisible();
  });
});
