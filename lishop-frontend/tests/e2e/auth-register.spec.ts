import { expect, test } from '@playwright/test';

const AUTH_URL = process.env['E2E_AUTH_URL'] ?? 'http://localhost:3001';
const ADMIN_URL = process.env['E2E_ADMIN_URL'] ?? 'http://localhost:3009';

test.describe('auth registration', () => {
  test('redirects admin users to the admin dashboard after login', async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { accessToken: 'admin-token' } }),
      });
    });

    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'admin-1',
            email: 'admin@lishop.vn',
            firstName: 'Admin',
            lastName: 'User',
            role: 'ADMIN',
            emailVerified: true,
          },
        }),
      });
    });

    await page.goto(`${AUTH_URL}/login`, { waitUntil: 'networkidle' });
    await page.locator('#email').fill('admin@lishop.vn');
    await page.locator('#password').fill('Admin@123');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    await expect(page).toHaveURL(`${ADMIN_URL}/admin`);
  });

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
