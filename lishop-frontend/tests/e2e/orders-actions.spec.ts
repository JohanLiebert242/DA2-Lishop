import { expect, test, type Page } from '@playwright/test';

const ORDERS_URL = process.env['E2E_ORDERS_URL'] ?? 'http://localhost:3005';
const CATALOG_URL = process.env['E2E_CATALOG_URL'] ?? 'http://localhost:3002';

async function addLoginCookie(page: Page) {
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
}

test.describe('my orders actions', () => {
  test('customer can contact shop from an order and buy the product again', async ({ page }) => {
    await addLoginCookie(page);

    await page.route('**/orders', async (route) => {
      if (route.request().resourceType() === 'document') return route.fallback();
      // Only stub backend API calls (not MFE page navigations).
      if (!route.request().url().includes(':4000/')) return route.fallback();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'order-1',
              orderNumber: 'LS-ORDER-001',
              status: 'DELIVERED',
              subtotalVnd: 1200000,
              shippingFeeVnd: 30000,
              discountVnd: 0,
              totalVnd: 1230000,
              notes: null,
              trackingNumber: null,
              createdAt: new Date('2026-06-01T09:00:00Z').toISOString(),
              items: [
                {
                  id: 'item-1',
                  productId: 'product-1',
                  productSlug: 'iphone-15-pro',
                  productName: 'iPhone 15 Pro',
                  variantId: null,
                  variantName: null,
                  variantSku: null,
                  variantAttributes: null,
                  quantity: 1,
                  unitPriceVnd: 1200000,
                  totalPriceVnd: 1200000,
                },
              ],
              address: {
                fullName: 'Order Tester',
                phone: '0901234567',
                street: '123 Nguyen Hue',
                district: 'District 1',
                city: 'Ho Chi Minh City',
                country: 'Vietnam',
              },
              payment: null,
              shipment: { deliveredAt: new Date('2026-06-03T09:00:00Z').toISOString() },
            },
          ],
        }),
      });
    });

    await page.route(`${CATALOG_URL}/products/iphone-15-pro`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<main>Product detail: iPhone 15 Pro</main>',
      });
    });

    await page.goto(`${ORDERS_URL}/orders`);
    await expect(page.getByText('iPhone 15 Pro')).toBeVisible();

    await page.getByRole('link', { name: /mua/i }).first().click();
    await expect(page).toHaveURL(`${CATALOG_URL}/products/iphone-15-pro`);

    await page.goto(`${ORDERS_URL}/orders`);
    await page.getByRole('button', { name: /liên hệ người bán/i }).click();

    await expect(page.getByTestId('order-shop-chat-panel')).toBeVisible();
    await expect(page.getByTestId('order-shop-chat-panel')).toContainText('LS-ORDER-001');
    await page.getByTestId('order-shop-chat-input').fill('Shop ơi đơn này giao xong chưa?');
    await page.getByTestId('order-shop-chat-send').click();
    await expect(page.getByText('Shop ơi đơn này giao xong chưa?')).toBeVisible();
    await expect(page.getByText(/Shop đã nhận tin nhắn/)).toBeVisible();
    await expect(page).toHaveURL(`${ORDERS_URL}/orders`);
  });

  test('customer can confirm delivery for a shipped order', async ({ page }) => {
    await addLoginCookie(page);

    await page.route('**/orders/order-shipped', async (route) => {
      if (route.request().resourceType() === 'document') return route.fallback();
      if (!route.request().url().includes(':4000/')) return route.fallback();

      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 'order-shipped',
              orderNumber: 'LS-ORDER-002',
              status: 'DELIVERED',
              subtotalVnd: 850000,
              shippingFeeVnd: 30000,
              discountVnd: 0,
              totalVnd: 880000,
              notes: null,
              trackingNumber: 'GHN-002',
              createdAt: new Date('2026-06-02T09:00:00Z').toISOString(),
              items: [
                {
                  id: 'item-2',
                  productId: 'product-2',
                  productSlug: 'airpods-pro',
                  productName: 'AirPods Pro',
                  variantId: null,
                  variantName: null,
                  variantSku: null,
                  variantAttributes: null,
                  quantity: 1,
                  unitPriceVnd: 850000,
                  totalPriceVnd: 850000,
                },
              ],
              address: {
                fullName: 'Order Tester',
                phone: '0901234567',
                street: '123 Nguyen Hue',
                district: 'District 1',
                city: 'Ho Chi Minh City',
                country: 'Vietnam',
              },
              payment: {
                id: 'payment-2',
                method: 'COD',
                amountVnd: 880000,
                status: 'COMPLETED',
              },
              shipment: { deliveredAt: new Date('2026-06-04T09:00:00Z').toISOString() },
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'order-shipped',
            orderNumber: 'LS-ORDER-002',
            status: 'SHIPPED',
            subtotalVnd: 850000,
            shippingFeeVnd: 30000,
            discountVnd: 0,
            totalVnd: 880000,
            notes: null,
            trackingNumber: 'GHN-002',
            createdAt: new Date('2026-06-02T09:00:00Z').toISOString(),
            items: [
              {
                id: 'item-2',
                productId: 'product-2',
                productSlug: 'airpods-pro',
                productName: 'AirPods Pro',
                variantId: null,
                variantName: null,
                variantSku: null,
                variantAttributes: null,
                quantity: 1,
                unitPriceVnd: 850000,
                totalPriceVnd: 850000,
              },
            ],
            address: {
              fullName: 'Order Tester',
              phone: '0901234567',
              street: '123 Nguyen Hue',
              district: 'District 1',
              city: 'Ho Chi Minh City',
              country: 'Vietnam',
            },
            payment: {
              id: 'payment-2',
              method: 'COD',
              amountVnd: 880000,
              status: 'COMPLETED',
            },
            shipment: { deliveredAt: null },
          },
        }),
      });
    });

    await page.route('**/orders/order-shipped/tracking', async (route) => {
      if (!route.request().url().includes(':4000/')) return route.fallback();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            shipment: {
              id: 'shipment-2',
              provider: 'GHN',
              trackingNumber: 'GHN-002',
              estimatedAt: new Date('2026-06-05T09:00:00Z').toISOString(),
              shippedAt: new Date('2026-06-03T09:00:00Z').toISOString(),
              deliveredAt: null,
              events: [
                {
                  id: 'event-1',
                  status: 'PICKED_UP',
                  location: 'Ho Chi Minh City',
                  description: 'Đơn hàng đã được bàn giao cho đơn vị vận chuyển',
                  createdAt: new Date('2026-06-03T09:00:00Z').toISOString(),
                },
              ],
            },
          },
        }),
      });
    });

    await page.route('**/refunds', async (route) => {
      if (!route.request().url().includes(':4000/')) return route.fallback();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.route('**/returns', async (route) => {
      if (!route.request().url().includes(':4000/')) return route.fallback();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto(`${ORDERS_URL}/orders/order-shipped`);
    await expect(page.getByText(/đang giao hàng/i).first()).toBeVisible();
    await page.getByRole('button', { name: /đã nhận hàng/i }).click();
    await expect(page.getByText(/đã giao thành công/i)).toBeVisible();
  });
});
