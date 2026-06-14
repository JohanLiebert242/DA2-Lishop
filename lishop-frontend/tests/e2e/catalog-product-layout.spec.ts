import { expect, test } from '@playwright/test';

const CATALOG_URL = process.env['E2E_CATALOG_URL'] ?? 'http://localhost:3002';

test.describe('catalog product detail layout', () => {
  test('places shop overview above the two-column product detail section', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 1100 });

    await page.goto(`${CATALOG_URL}/products/layout-product`, { waitUntil: 'domcontentloaded' });

    const shopSection = page.getByTestId('product-shop-section');
    const detailShell = page.getByTestId('product-detail-shell');
    const detailMain = page.getByTestId('product-detail-main');
    const detailSidebar = page.getByTestId('product-detail-sidebar');

    await expect(shopSection).toBeVisible();
    await expect(shopSection.getByText('Chat Ngay')).toBeVisible();
    await expect(shopSection.getByTestId('shop-profile-link')).toBeVisible();
    await expect(shopSection).toContainText('Thương hiệu');
    await expect(shopSection).toContainText('Danh mục');
    await expect(shopSection).toContainText('Biến thể');

    await expect(detailShell).toBeVisible();
    await expect(detailMain).toBeVisible();
    await expect(detailMain).toContainText('CHI TIẾT SẢN PHẨM');
    await expect(detailSidebar).toBeVisible();
    await expect(detailSidebar).toContainText('Mã giảm giá của Shop');

    const shopBox = await shopSection.boundingBox();
    const detailBox = await detailShell.boundingBox();
    const mainBox = await detailMain.boundingBox();
    const sidebarBox = await detailSidebar.boundingBox();

    expect(shopBox).toBeTruthy();
    expect(detailBox).toBeTruthy();
    expect(mainBox).toBeTruthy();
    expect(sidebarBox).toBeTruthy();

    expect(detailBox!.y).toBeGreaterThan(shopBox!.y + shopBox!.height - 1);
    expect(sidebarBox!.x).toBeGreaterThan(mainBox!.x + mainBox!.width - 8);
    expect(Math.abs(sidebarBox!.y - mainBox!.y)).toBeLessThan(8);
  });
});
