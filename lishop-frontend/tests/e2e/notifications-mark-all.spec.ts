import { expect, test, type Page } from '@playwright/test';

const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:4000';
const NOTIFICATIONS_URL = process.env['E2E_NOTIFICATIONS_URL'] ?? 'http://localhost:3008';

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

test.describe('notifications feed', () => {
  test('customer can mark all notifications as read', async ({ page }) => {
    let markAllCalled = false;
    await addLoginCookie(page);

    await page.route(`${API_URL}/notifications?*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'notif-1',
              userId: 'user-1',
              title: 'Order shipped',
              body: 'Your order is on the way.',
              type: 'ORDER_STATUS',
              relatedId: 'order-1',
              isRead: false,
              createdAt: new Date('2026-06-01T09:00:00Z').toISOString(),
            },
            {
              id: 'notif-2',
              userId: 'user-1',
              title: 'Coupon ready',
              body: 'A new coupon is available.',
              type: 'PROMOTIONS',
              relatedId: null,
              isRead: false,
              createdAt: new Date('2026-06-02T09:00:00Z').toISOString(),
            },
          ],
        }),
      });
    });

    await page.route(`${API_URL}/notifications/read-all`, async (route) => {
      markAllCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { count: 2 } }),
      });
    });

    await page.goto(`${NOTIFICATIONS_URL}/notifications`);
    await expect(page.getByText('Order shipped')).toBeVisible();
    await expect(page.getByText('Coupon ready')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đã đọc tất cả' })).toBeEnabled();

    await page.getByRole('button', { name: 'Đã đọc tất cả' }).click();

    await expect.poll(() => markAllCalled).toBe(true);
    await expect(page.getByRole('button', { name: /^Đã đọc$/ })).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('lishop_notification_count')))
      .toBe('0');
  });
});
