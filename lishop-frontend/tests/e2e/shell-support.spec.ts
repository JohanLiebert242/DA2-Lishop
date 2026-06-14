import { expect, test } from '@playwright/test';

const SHELL_URL = process.env['E2E_SHELL_URL'] ?? 'http://localhost:3010';

test.describe('shell support center', () => {
  test('renders a Shopee-like help center with search, categories and FAQ', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(`${SHELL_URL}/support`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('support-hero')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Lishop có thể giúp gì cho bạn/i })).toBeVisible();
    await expect(page.getByTestId('support-search-input')).toBeVisible();
    await expect(page.getByTestId('support-alert')).toContainText('Cập nhật');

    const categories = page.getByTestId('support-category-card');
    await expect(categories).toHaveCount(6);
    await expect(categories.first()).toContainText('Mua Sắm Cùng Lishop');
    await expect(page.getByTestId('support-faq-list').getByRole('link')).toHaveCount(8);
    await expect(page.getByRole('link', { name: 'Lishop Policies' })).toBeVisible();

    await page.getByTestId('support-search-input').fill('hoàn tiền');
    await page.getByTestId('support-search-submit').click();
    await expect(page).toHaveURL(/\/support\?q=ho%C3%A0n\+ti%E1%BB%81n/);
  });

  test('shows AI chat support and sends a message', async ({ page }) => {
    await page.route('**/support/chat', async (route) => {
      const body = route.request().postDataJSON() as { message?: string };
      expect(body.message).toBe('Tôi cần hỗ trợ đơn hàng');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            reply: 'Bạn có thể vào mục Đơn hàng để theo dõi hoặc tạo yêu cầu hỗ trợ.',
            type: 'text',
          },
        }),
      });
    });

    await page.goto(`${SHELL_URL}/support`, { waitUntil: 'networkidle' });
    const chatToggle = page.getByTestId('shell-ai-chat-toggle');
    await expect(chatToggle).toBeVisible();
    await chatToggle.click();
    await expect(page.getByTestId('shell-ai-chat-panel')).toBeVisible();
    await page.getByTestId('shell-ai-chat-input').fill('Tôi cần hỗ trợ đơn hàng');
    await page.getByTestId('shell-ai-chat-send').click();

    await expect(page.getByText('Bạn có thể vào mục Đơn hàng để theo dõi')).toBeVisible();
  });

  test('marks notification badge as read when opening the notifications panel', async ({ page }) => {
    let markAllCalled = false;

    await page.context().addCookies([
      { name: 'lishop_session', value: '1', domain: 'localhost', path: '/', sameSite: 'Lax' },
    ]);

    await page.addInitScript(() => {
      window.localStorage.setItem('lishop_notification_count', '3');
    });

    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'user-shell-notifications',
            email: 'shell-notifications@lishop.vn',
            firstName: 'Shell',
            lastName: 'Notifications',
            role: 'CUSTOMER',
            emailVerified: true,
          },
        }),
      });
    });

    await page.route('**/notifications?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'notif-1',
              title: 'Order shipped',
              body: 'Your order is on the way.',
              isRead: false,
            },
          ],
        }),
      });
    });

    await page.route('**/notifications/read-all', async (route) => {
      markAllCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { count: 3 } }),
      });
    });

    await page.goto(`${SHELL_URL}/support`, { waitUntil: 'networkidle' });

    const notificationButton = page.locator('button[aria-label]').first();
    await expect(notificationButton).toContainText('3');

    await notificationButton.click();

    await expect.poll(() => markAllCalled).toBe(true);
    await expect(notificationButton).not.toContainText('3');
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('lishop_notification_count')))
      .toBe('0');
  });

  test('updates header avatar when profile data changes', async ({ page }) => {
    const initialAvatar = 'data:image/png;base64,aW5pdGlhbA==';
    const nextAvatar = 'data:image/png;base64,dXBkYXRlZA==';

    await page.context().addCookies([
      { name: 'lishop_session', value: '1', domain: 'localhost', path: '/', sameSite: 'Lax' },
    ]);

    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'user-avatar-sync',
            email: 'avatar-sync@lishop.vn',
            firstName: 'Avatar',
            lastName: 'Sync',
            avatarUrl: initialAvatar,
            role: 'CUSTOMER',
            emailVerified: true,
          },
        }),
      });
    });

    await page.goto(`${SHELL_URL}/support`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('shell-account-avatar')).toHaveAttribute('src', initialAvatar);

    await page.evaluate((avatarUrl) => {
      const channel = new BroadcastChannel('lishop-events');
      channel.postMessage({
        event: 'PROFILE_UPDATED',
        payload: { userId: 'user-avatar-sync', avatarUrl },
      });
      channel.close();
    }, nextAvatar);

    await expect(page.getByTestId('shell-account-avatar')).toHaveAttribute('src', nextAvatar);
  });
});
