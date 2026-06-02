import { expect, test } from '@playwright/test';

const API_URL = process.env['E2E_API_URL'] ?? 'http://127.0.0.1:4000';
const CATALOG_URL = process.env['E2E_CATALOG_URL'] ?? 'http://localhost:3002';
const CART_URL = process.env['E2E_CART_URL'] ?? 'http://localhost:3003';
const CHECKOUT_URL = process.env['E2E_CHECKOUT_URL'] ?? 'http://localhost:3004';
const ORDERS_URL = process.env['E2E_ORDERS_URL'] ?? 'http://localhost:3005';
const CUSTOMER_EMAIL = process.env['E2E_CUSTOMER_EMAIL'] ?? 'nguyen@lishop.vn';
const CUSTOMER_PASSWORD = process.env['E2E_CUSTOMER_PASSWORD'] ?? 'Customer@123';

type ProductSummary = {
  id: string;
  slug: string;
  stock: number;
  variants?: { id: string; stock: number; isDefault: boolean }[];
};

async function unwrap<T>(response: { json(): Promise<unknown> }): Promise<T> {
  const json = await response.json();
  return (json.data ?? json) as T;
}

test.describe('checkout flow', () => {
  test('customer can add a product to cart and place a COD order', async ({ page }) => {
    const login = await page.request.post(`${API_URL}/auth/login`, {
      data: { email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD },
    });
    expect(login.ok()).toBeTruthy();
    const loginData = await unwrap<{ accessToken: string }>(login);
    await page.context().addCookies([
      {
        name: 'lishop_at',
        value: loginData.accessToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
      {
        name: 'lishop_session',
        value: '1',
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        sameSite: 'Lax',
      },
    ]);

    const cartResponse = await page.request.get(`${API_URL}/cart`);
    if (cartResponse.ok()) {
      const cart = await unwrap<{ items: { productId: string; variantId: string | null }[] }>(cartResponse);
      for (const item of cart.items) {
        const qs = item.variantId ? `?variantId=${item.variantId}` : '';
        await page.request.delete(`${API_URL}/cart/items/${item.productId}${qs}`);
      }
    }

    const productsResponse = await page.request.get(`${API_URL}/products?limit=20`);
    expect(productsResponse.ok()).toBeTruthy();
    const products = await unwrap<{ items: ProductSummary[] }>(productsResponse);
    const product = products.items.find((item) => {
      const defaultVariant = item.variants?.find((variant) => variant.isDefault) ?? item.variants?.[0];
      return (defaultVariant?.stock ?? item.stock) > 0;
    });
    expect(product, 'seeded catalog should contain an in-stock product').toBeTruthy();

    await page.goto(`${CATALOG_URL}/products/${product!.slug}`);
    await page.getByRole('button', { name: /thêm|them|add/i }).first().click();

    await page.goto(`${CART_URL}/cart`);
    await expect(page.getByRole('link', { name: /thanh toán|thanh toan|checkout/i })).toBeVisible();
    await page.getByRole('link', { name: /thanh toán|thanh toan|checkout/i }).click();

    await expect(page).toHaveURL(new RegExp(`${CHECKOUT_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/checkout`));
    await page.getByRole('button', { name: /tiếp tục|tiep tuc|continue/i }).click();
    await page.getByRole('button', { name: /tiếp tục|tiep tuc|continue/i }).click();
    await page.getByRole('button', { name: /đặt hàng|dat hang|place order/i }).click();

    await expect(page).toHaveURL(/\/orders/, { timeout: 30_000 });
    await expect(page.getByText(/LS-|đơn hàng|don hang/i).first()).toBeVisible();
    expect(page.url().startsWith(ORDERS_URL)).toBeTruthy();
  });
});
