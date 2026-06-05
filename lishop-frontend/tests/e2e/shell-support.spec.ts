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
});
