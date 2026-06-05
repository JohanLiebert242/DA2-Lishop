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

test.describe('profile avatar', () => {
  test('customer can upload and save a data URL avatar', async ({ page }) => {
    let savedAvatarUrl: string | null = null;
    await addLoginCookies(page);

    await page.route('**/users/profile', async (route) => {
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON() as { avatarUrl?: string };
        expect(body.avatarUrl).toMatch(/^data:image\/png;base64,/);
        expect(body.avatarUrl?.length).toBeGreaterThan(500);
        savedAvatarUrl = body.avatarUrl ?? null;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'user-avatar',
            email: 'avatar@example.com',
            firstName: 'Avatar',
            lastName: 'Tester',
            avatarUrl: savedAvatarUrl,
            loyaltyPoints: 0,
            role: 'CUSTOMER',
            createdAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.route('**/users/loyalty-history', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto(`${PROFILE_URL}/profile`);
    await expect(page.locator('text=Avatar Tester').first()).toBeVisible();

    await page.locator('button.btn-primary').last().click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(1024, 1),
    });

    const preview = page.locator('img[alt="preview"]');
    await expect(preview).toHaveAttribute('src', /^data:image\/png;base64,/);
    const previewSrc = await preview.getAttribute('src');
    expect(previewSrc?.length).toBeGreaterThan(500);

    await page.locator('button.btn-primary').first().click();
    await expect(page.locator('img[alt="Avatar Tester"]')).toHaveAttribute('src', previewSrc!);
    expect(savedAvatarUrl).toBe(previewSrc);
  });
});
