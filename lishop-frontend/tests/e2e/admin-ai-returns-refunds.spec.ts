import { expect, test } from '@playwright/test';

const ADMIN_URL = process.env['E2E_ADMIN_URL'] ?? 'http://localhost:3009';

test.describe('admin AI returns/refunds assist', () => {
  test('fills return status and note from AI assist', async ({ page, context }) => {
    await context.addCookies([
      { name: 'lishop_session', value: '1', domain: 'localhost', path: '/' },
    ]);

    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 'admin-1', email: 'admin@lishop.test', role: 'ADMIN' } }),
      });
    });

    await page.route('**/admin/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { orderCount: 0, revenueVnd: 0, userCount: 0, productCount: 0 } }),
      });
    });

    await page.route('**/admin/returns', async (route) => {
      // Avoid intercepting the actual Next.js page navigation to /admin/returns.
      if (route.request().resourceType() === 'document') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'ret-1',
              orderId: 'order-1',
              status: 'PENDING',
              reason: 'DAMAGED',
              description: 'Hong',
              adminNote: null,
              createdAt: new Date('2026-06-01T09:00:00Z').toISOString(),
              updatedAt: new Date('2026-06-01T09:00:00Z').toISOString(),
              order: { orderNumber: 'LS-1', totalVnd: 100000 },
              user: { email: 'c@lishop.test', firstName: 'C', lastName: 'U' },
              items: [],
            },
          ],
        }),
      });
    });

    await page.route('**/admin/returns/ret-1/ai-assist', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            suggestedStatus: 'REJECTED',
            adminNote: 'Khong du dieu kien doi tra.',
            summary: 'Nen tu choi.',
            reasons: ['Thong tin thieu'],
            fallback: false,
          },
        }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/returns`, { waitUntil: 'networkidle' });
    await page.getByTestId('return-update-ret-1').click();

    await page.getByTestId('return-ai-ret-1').click();
    await expect(page.locator('#return-status-ret-1')).toHaveValue('REJECTED');
    await expect(page.locator('#return-note-ret-1')).toHaveValue(/Khong du dieu kien/);
  });

  test('shows refund AI suggestion text', async ({ page, context }) => {
    await context.addCookies([
      { name: 'lishop_session', value: '1', domain: 'localhost', path: '/' },
    ]);

    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 'admin-1', email: 'admin@lishop.test', role: 'ADMIN' } }),
      });
    });

    await page.route('**/admin/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { orderCount: 0, revenueVnd: 0, userCount: 0, productCount: 0 } }),
      });
    });

    await page.route('**/admin/refunds', async (route) => {
      // Avoid intercepting the actual Next.js page navigation to /admin/refunds.
      if (route.request().resourceType() === 'document') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'ref-1',
              orderId: 'order-1',
              amountVnd: 50000,
              method: 'WALLET',
              status: 'PENDING',
              reason: null,
              adminNote: null,
              createdAt: new Date('2026-06-01T09:00:00Z').toISOString(),
              updatedAt: new Date('2026-06-01T09:00:00Z').toISOString(),
              order: { orderNumber: 'LS-1' },
              user: { email: 'c@lishop.test', firstName: 'C', lastName: 'U' },
            },
          ],
        }),
      });
    });

    await page.route('**/admin/refunds/ref-1/ai-assist', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            shouldProcess: true,
            adminNote: 'Xu ly hoan vao vi.',
            summary: 'Nen xu ly ngay.',
            reasons: ['Pending'],
            fallback: false,
          },
        }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/refunds`, { waitUntil: 'networkidle' });
    await page.getByTestId('refund-ai-ref-1').click();
    await expect(page.getByText(/Nen xu ly ngay/)).toBeVisible();
  });
});
