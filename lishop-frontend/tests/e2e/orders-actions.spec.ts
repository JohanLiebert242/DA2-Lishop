import { expect, test, type Page } from '@playwright/test';

const ORDERS_URL = process.env['E2E_ORDERS_URL'] ?? 'http://localhost:3005';
const CATALOG_URL = process.env['E2E_CATALOG_URL'] ?? 'http://localhost:3002';
const PROFILE_URL = process.env['E2E_PROFILE_URL'] ?? 'http://localhost:3006';
const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:4000';

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
    let createdTicketPayload: Record<string, unknown> | null = null;
    await addLoginCookie(page);

    await page.route(`${API_URL}/orders`, async (route) => {
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

    await page.route(`${API_URL}/support/tickets`, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }

      createdTicketPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'ticket-order-1',
            userId: 'user-1',
            category: 'ORDER',
            subject: 'Lien he shop ve don hang LS-ORDER-001',
            status: 'OPEN',
            orderRef: 'LS-ORDER-001',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            user: { id: 'user-1', email: 'buyer@example.com', firstName: 'Order', lastName: 'Tester' },
            messages: [],
          },
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
    await page.route(`${PROFILE_URL}/support/ticket-order-1`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<main>Chat with shop</main>',
      });
    });

    await page.goto(`${ORDERS_URL}/orders`);
    await expect(page.getByText('iPhone 15 Pro')).toBeVisible();

    await page.getByRole('link', { name: /mua/i }).click();
    await expect(page).toHaveURL(`${CATALOG_URL}/products/iphone-15-pro`);

    await page.goto(`${ORDERS_URL}/orders`);
    await page.getByRole('button', { name: /li/i }).click();

    await expect.poll(() => createdTicketPayload).not.toBeNull();
    expect(createdTicketPayload).toMatchObject({
      category: 'ORDER',
      orderRef: 'LS-ORDER-001',
    });
    expect(String(createdTicketPayload?.['subject'])).toContain('LS-ORDER-001');
    expect(String(createdTicketPayload?.['description'])).toContain('iPhone 15 Pro');
    await expect(page).toHaveURL(`${PROFILE_URL}/support/ticket-order-1`);
  });
});
