import { expect, test, type Page } from '@playwright/test';

const API_URL = process.env['E2E_API_URL'] ?? 'http://127.0.0.1:4000';
const CART_URL = process.env['E2E_CART_URL'] ?? 'http://localhost:3003';
const CHECKOUT_URL = process.env['E2E_CHECKOUT_URL'] ?? 'http://localhost:3004';
const ORDERS_URL = process.env['E2E_ORDERS_URL'] ?? 'http://localhost:3005';
const CUSTOMER_PASSWORD = process.env['E2E_CUSTOMER_PASSWORD'] ?? 'Customer@123';

type ProductSummary = {
  id: string;
  slug: string;
  stock: number;
  variants?: { id: string; stock: number; isDefault: boolean }[];
};

type PaymentMethod = 'COD' | 'VNPAY' | 'MOMO';

async function unwrap<T>(response: { json(): Promise<unknown> }): Promise<T> {
  const json = await response.json();
  return (json.data ?? json) as T;
}

async function registerCustomer(page: Page): Promise<string> {
  const email = `e2e-checkout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@lishop.vn`;
  const register = await page.request.post(`${API_URL}/auth/register`, {
    data: {
      email,
      password: CUSTOMER_PASSWORD,
      firstName: 'Checkout',
      lastName: 'Tester',
    },
  });
  expect(register.ok()).toBeTruthy();
  const loginData = await unwrap<{ accessToken: string }>(register);
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
  return loginData.accessToken;
}

async function createShippingAddress(page: Page, accessToken: string) {
  const response = await page.request.post(`${API_URL}/addresses`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      fullName: 'E2E Checkout Tester',
      phone: '0901234567',
      street: '123 Nguyen Hue',
      district: 'District 1',
      city: 'Ho Chi Minh City',
      country: 'Vietnam',
      latitude: 10.77584,
      longitude: 106.70175,
    },
  });
  expect(response.ok()).toBeTruthy();
}

async function clearCart(page: Page, accessToken: string) {
  const cartResponse = await page.request.get(`${API_URL}/cart`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!cartResponse.ok()) return;

  const cart = await unwrap<{ items: { productId: string; variantId: string | null }[] }>(cartResponse);
  for (const item of cart.items) {
    const qs = item.variantId ? `?variantId=${item.variantId}` : '';
    await page.request.delete(`${API_URL}/cart/items/${item.productId}${qs}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}

async function addInStockProductToCart(page: Page, accessToken: string) {
  const productsResponse = await page.request.get(`${API_URL}/products?limit=20`);
  expect(productsResponse.ok()).toBeTruthy();
  const products = await unwrap<{ items: ProductSummary[] }>(productsResponse);
  const product = products.items.find((item) => {
    const defaultVariant = item.variants?.find((variant) => variant.isDefault) ?? item.variants?.[0];
    return item.stock > 0 && (defaultVariant?.stock ?? item.stock) > 0;
  });
  expect(product, 'seeded catalog should contain an in-stock product').toBeTruthy();
  const variant = product!.variants?.find((item) => item.isDefault) ?? product!.variants?.[0];

  const addResponse = await page.request.post(`${API_URL}/cart/items`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      productId: product!.id,
      variantId: variant?.id,
      quantity: 1,
    },
  });
  expect(addResponse.ok()).toBeTruthy();
  await expect
    .poll(async () => {
      const response = await page.request.get(`${API_URL}/cart`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok()) return 0;
      const cart = await unwrap<{ items: unknown[] }>(response);
      return cart.items.length;
    })
    .toBeGreaterThan(0);
}

async function moveToPaymentStep(page: Page) {
  await page.goto(`${CART_URL}/cart`);
  await expect(page.getByRole('heading', { level: 1, name: /gi/i })).toBeVisible();
  await page.goto(`${CHECKOUT_URL}/checkout`);
  await expect(page).toHaveURL(new RegExp(`${CHECKOUT_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/checkout`));
  await page.locator('main button').last().click();
  await page.locator('main button').last().click();
}

async function prepareCheckout(page: Page): Promise<string> {
  const accessToken = await registerCustomer(page);
  await createShippingAddress(page, accessToken);
  await clearCart(page, accessToken);
  await addInStockProductToCart(page, accessToken);
  await moveToPaymentStep(page);
  return accessToken;
}

async function placeOrder(page: Page, method: PaymentMethod) {
  if (method !== 'COD') {
    await page.getByRole('button', { name: new RegExp(method, 'i') }).click();
  }
  await page.locator('main button').last().click();
}

test.describe('checkout flow', () => {
  test('customer can add a product to cart and place a COD order', async ({ page }) => {
    await prepareCheckout(page);
    await placeOrder(page, 'COD');

    await expect(page).toHaveURL(/\/orders/, { timeout: 30_000 });
    await expect(page.getByText(/LS-|Ä‘Æ¡n hÃ ng|don hang/i).first()).toBeVisible();
    expect(page.url().startsWith(ORDERS_URL)).toBeTruthy();
  });

  for (const method of ['VNPAY', 'MOMO'] as PaymentMethod[]) {
    test(`customer can place an order with ${method} and return from the local gateway`, async ({ page }) => {
      const accessToken = await prepareCheckout(page);
      await placeOrder(page, method);

      await expect(page).toHaveURL(/\/checkout\/payment-result\?success=true&orderId=/, {
        timeout: 30_000,
      });
      const orderId = new URL(page.url()).searchParams.get('orderId');
      expect(orderId).toBeTruthy();

      const paymentResponse = await page.request.get(`${API_URL}/payments/${orderId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(paymentResponse.ok()).toBeTruthy();
      const payment = await unwrap<{ method: string; status: string }>(paymentResponse);
      expect(payment.method).toBe(method);
      expect(payment.status).toBe('COMPLETED');
    });
  }
});
