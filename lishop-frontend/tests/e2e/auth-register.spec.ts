import { expect, test } from '@playwright/test';

const AUTH_URL = process.env['E2E_AUTH_URL'] ?? 'http://localhost:3001';

test.describe('auth registration', () => {
  test('requires a fresh login after successful registration', async ({ page }) => {
    await page.route('**/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: { accessToken: 'registered-access-token' } }),
      });
    });

    await page.goto(`${AUTH_URL}/register`);
    await page.locator('#lastName').fill('Nguyen');
    await page.locator('#firstName').fill('An');
    await page.locator('#email').fill(`register-${Date.now()}@lishop.vn`);
    await page.locator('#password').fill('Customer@123');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    const cookies = await page.context().cookies();
    expect(cookies.some((cookie) => cookie.name === 'lishop_session')).toBe(false);
  });
});
