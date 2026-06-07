import { expect, test, type Page } from '@playwright/test';

const PROFILE_URL = process.env['E2E_PROFILE_URL'] ?? 'http://localhost:3006';

async function addLoginCookies(page: Page) {
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

async function mockWalletApis(page: Page) {
  await page.route('**/wallet', async (route) => {
    if (route.request().resourceType() !== 'fetch') {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'wallet-e2e',
          balanceVnd: 125000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    });
  });

  await page.route('**/wallet/transactions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route('**/wallet/topup-requests', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route('**/wallet/convert-points', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Không đủ điểm tích lũy. Bạn hiện có 5 điểm, cần 100 điểm',
      }),
    });
  });
}

test.describe('profile wallet', () => {
  test('shows a bank transfer QR without creating a top-up request and formats numeric inputs', async ({ page }) => {
    let topupRequestCalls = 0;
    await addLoginCookies(page);
    await mockWalletApis(page);
    await page.route('**/wallet/topup', async (route) => {
      topupRequestCalls += 1;
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    });

    await page.goto(`${PROFILE_URL}/wallet`);

    const topupAmount = page.getByTestId('wallet-topup-amount');
    await topupAmount.fill('10000');
    await expect(topupAmount).toHaveValue('10.000');
    await page.getByTestId('wallet-topup-submit').click();

    await expect(page.getByTestId('wallet-topup-qr')).toBeVisible();
    await expect(page.getByText('10.000 ₫', { exact: true })).toBeVisible();
    expect(topupRequestCalls).toBe(0);

    const pointsAmount = page.getByTestId('wallet-points-amount');
    await pointsAmount.fill('10000');
    await expect(pointsAmount).toHaveValue('10.000');
  });

  test('shows Vietnamese error when converting more points than available', async ({ page }) => {
    await addLoginCookies(page);
    await mockWalletApis(page);

    await page.goto(`${PROFILE_URL}/wallet`);
    await page.getByTestId('wallet-points-amount').fill('100');
    await page.getByTestId('wallet-points-submit').click();

    await expect(
      page.getByText('Không đủ điểm tích lũy. Bạn hiện có 5 điểm, cần 100 điểm'),
    ).toBeVisible();
  });
});
