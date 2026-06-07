import { expect, test } from '@playwright/test';

const ADMIN_URL = process.env['E2E_ADMIN_URL'] ?? 'http://localhost:3009';

test.describe('admin ticket AI assist', () => {
  test('fills a support reply draft from the AI assistant', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'lishop_session',
        value: '1',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.route('http://localhost:4000/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'admin-1',
            email: 'admin@lishop.test',
            role: 'ADMIN',
          },
        }),
      });
    });

    await page.route('http://localhost:4000/admin/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { orderCount: 1, revenueVnd: 0, userCount: 1, productCount: 0 },
        }),
      });
    });

    await page.route('http://localhost:4000/admin/tickets/*/ai-assist', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            summary: 'Khach chua nhan duoc hang va can Lishop kiem tra van chuyen.',
            suggestedCategory: 'SHIPPING',
            suggestedStatus: 'IN_PROGRESS',
            replyDraft: 'Chao ban, Lishop se kiem tra van chuyen va phan hoi som.',
            fallback: false,
          },
        }),
      });
    });

    await page.route('http://localhost:4000/admin/tickets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: '11111111-1111-1111-1111-111111111111',
              subject: 'Don hang chua giao',
              category: 'SHIPPING',
              status: 'OPEN',
              orderRef: 'LS-1',
              createdAt: '2026-06-06T00:00:00.000Z',
              user: {
                email: 'customer@lishop.test',
                firstName: 'A',
                lastName: 'B',
              },
              _count: { messages: 1 },
              messages: [
                {
                  content: 'Toi chua nhan duoc hang',
                  createdAt: '2026-06-06T00:00:00.000Z',
                  isAdmin: false,
                },
              ],
            },
          ],
        }),
      });
    });

    await page.route('http://localhost:4000/admin/tickets?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
        }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/tickets`, { waitUntil: 'networkidle' });

    await expect(page.getByText('customer@lishop.test')).toBeVisible();
    await page.getByRole('button', { name: /phản hồi/i }).click();
    await page.getByRole('button', { name: 'AI gợi ý' }).click();

    await expect(page.getByText(/Khach chua nhan duoc hang/)).toBeVisible();
    await expect(page.locator('textarea')).toHaveValue(
      /Chao ban, Lishop se kiem tra van chuyen va phan hoi som/,
    );
  });
});
