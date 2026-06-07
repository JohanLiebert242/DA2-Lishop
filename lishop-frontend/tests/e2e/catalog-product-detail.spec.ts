import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API_URL = process.env['E2E_API_URL'] ?? 'http://127.0.0.1:4000';
const CATALOG_URL = process.env['E2E_CATALOG_URL'] ?? 'http://localhost:3002';
const PASSWORD = 'Customer@123';

type ProductImage = {
  id: string;
  url: string;
  isPrimary: boolean;
};

type ProductVariant = {
  id: string;
  imageUrl: string | null;
  stock: number;
  attributes: Record<string, string>;
};

type OrderInfo = {
  id: string;
  status: string;
};

type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  brand?: string;
  images: ProductImage[];
  variants: ProductVariant[];
};

type ProductListResponse = {
  items: ProductSummary[];
  nextCursor: string | null;
};

async function unwrap<T>(response: { json(): Promise<unknown> }): Promise<T> {
  const json = await response.json();
  return (json.data ?? json) as T;
}

async function getVariantProduct(request: APIRequestContext) {
  let cursor: string | null = null;
  const candidates: ProductSummary[] = [];
  for (let page = 0; page < 5; page += 1) {
    const response = await request.get(`${API_URL}/products?limit=100${cursor ? `&cursor=${cursor}` : ''}`);
    expect(response.ok()).toBeTruthy();
    const products = await unwrap<ProductListResponse>(response);
    candidates.push(...products.items.filter((item) => {
      const variantImages = new Set(item.variants.map((variant) => variant.imageUrl).filter(Boolean));
      const maxVariantStock = Math.max(...item.variants.map((variant) => variant.stock ?? 0));
      return item.brand && item.images.length >= 2 && item.variants.length >= 2 && variantImages.size >= 2 && maxVariantStock > 0;
    }));
    cursor = products.nextCursor ?? null;
    if (!cursor) break;
  }
  const product = candidates.sort((a, b) => {
    const aMaxVariantStock = Math.max(...a.variants.map((variant) => variant.stock ?? 0));
    const bMaxVariantStock = Math.max(...b.variants.map((variant) => variant.stock ?? 0));
    return (b.stock + bMaxVariantStock) - (a.stock + aMaxVariantStock);
  })[0];

  expect(product, 'seeded catalog should include a branded product with variant images').toBeTruthy();
  return product!;
}

async function registerCustomer(request: APIRequestContext, suffix: string) {
  const email = `e2e-${Date.now()}-${suffix}@lishop.vn`;
  const response = await request.post(`${API_URL}/auth/register`, {
    data: {
      email,
      password: PASSWORD,
      firstName: 'E2E',
      lastName: suffix,
    },
  });
  expect(response.ok()).toBeTruthy();
  const data = await unwrap<{ accessToken: string }>(response);
  return { email, accessToken: data.accessToken };
}

async function loginAdmin(request: APIRequestContext) {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: {
      email: 'admin@lishop.vn',
      password: 'Admin@12345',
    },
  });
  expect(response.ok()).toBeTruthy();
  const data = await unwrap<{ accessToken: string }>(response);
  return data.accessToken;
}

async function createDeliveredPurchase(
  request: APIRequestContext,
  accessToken: string,
  productId: string,
  variantId?: string,
) {
  const authHeaders = { Authorization: `Bearer ${accessToken}` };
  const cartResponse = await request.post(`${API_URL}/cart/items`, {
    headers: authHeaders,
    data: { productId, ...(variantId && { variantId }), quantity: 1 },
  });
  expect(cartResponse.ok()).toBeTruthy();

  const addressResponse = await request.post(`${API_URL}/addresses`, {
    headers: authHeaders,
    data: {
      fullName: 'E2E Buyer',
      phone: '0900000000',
      street: '1 Test Street',
      district: 'Quan 1',
      city: 'Ho Chi Minh',
      country: 'VN',
      isDefault: true,
    },
  });
  expect(addressResponse.ok()).toBeTruthy();
  const address = await unwrap<{ id: string }>(addressResponse);

  const orderResponse = await request.post(`${API_URL}/orders`, {
    headers: authHeaders,
    data: {
      addressId: address.id,
      paymentMethod: 'COD',
      shippingProvider: 'GHN',
    },
  });
  expect(orderResponse.ok()).toBeTruthy();
  const order = await unwrap<OrderInfo>(orderResponse);
  const adminToken = await loginAdmin(request);
  for (const status of ['PROCESSING', 'SHIPPED', 'DELIVERED']) {
    const statusResponse = await request.patch(`${API_URL}/admin/orders/${order.id}/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status },
    });
    expect(statusResponse.ok()).toBeTruthy();
  }
}

async function addLoginCookies(page: Page, accessToken: string) {
  await page.context().addCookies([
    {
      name: 'lishop_at',
      value: accessToken,
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
}

async function createReview(request: APIRequestContext, productId: string, index: number, rating = 5) {
  const { accessToken } = await registerCustomer(request, `review-${index}`);
  await createDeliveredPurchase(request, accessToken, productId);
  const response = await request.post(`${API_URL}/reviews/product/${productId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      rating,
      content: [
        `E2E seeded feedback ${index}`,
        `Media: https://dummyimage.com/320x240/000/fff.png?text=e2e-${index}`,
        `Media: https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4`,
      ].join('\n'),
    },
  });
  expect(response.ok()).toBeTruthy();
}

test.describe('catalog product and feedback experience', () => {
  test('product filters use range sliders and star choices', async ({ page }) => {
    await page.goto(`${CATALOG_URL}/products`);

    await expect(page.getByLabel('Giá tối thiểu')).toHaveAttribute('type', 'range');
    await expect(page.getByLabel('Giá tối đa')).toHaveAttribute('type', 'range');

    for (const star of [1, 2, 3, 4, 5]) {
      await expect(page.getByRole('button', { name: `${star} sao`, exact: true })).toBeVisible();
    }
  });

  test('product detail supports variants, shop page, description images, feedback media, filters and pagination', async ({ page, request }) => {
    const product = await getVariantProduct(request);
    for (let i = 1; i <= 6; i += 1) {
      await createReview(request, product.id, i, i % 2 === 0 ? 5 : 4);
    }
    const reviewer = await registerCustomer(request, 'visible-feedback');
    const purchasableVariant = product.variants.find((variant) => variant.stock > 0) ?? product.variants[0];
    await createDeliveredPurchase(request, reviewer.accessToken, product.id, purchasableVariant?.id);
    await addLoginCookies(page, reviewer.accessToken);

    await page.goto(`${CATALOG_URL}/products/${product.slug}`);

    const variantWithImage = product.variants.find((variant) => variant.imageUrl);
    expect(variantWithImage).toBeTruthy();
    const selectableValue = Object.values(variantWithImage!.attributes)[0];
    const expectedImageUrl = variantWithImage!.imageUrl!;

    await expect(page.getByTestId('product-main-image')).toBeVisible();
    await page.getByRole('button', { name: selectableValue, exact: true }).click();
    await expect(page.getByTestId('product-main-image')).toHaveAttribute('src', new RegExp(encodeURIComponent(expectedImageUrl).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

    await page.getByTestId('shop-profile-link').click();
    await expect(page).toHaveURL(/\/shops\//);
    await expect(page.locator('[data-testid="shop-product-card"]').first()).toBeVisible();

    await page.goto(`${CATALOG_URL}/products/${product.slug}`);
    await expect(page.locator('[data-testid="description-image"]').first()).toBeVisible();

    await page.getByTestId('write-review-button').click();
    await page.getByTestId('review-content').fill('E2E visible feedback with media');
    await page.getByTestId('review-media-url').fill([
      'https://dummyimage.com/320x240/000/fff.png?text=visible-review',
      'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    ].join('\n'));
    await page.getByTestId('submit-review-button').click();
    await expect(page.getByText('E2E visible feedback with media')).toBeVisible();
    await expect(page.locator('[data-testid="review-media-image"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="review-media-video"]').first()).toBeVisible();

    await page.getByTestId('review-filter-5').click();
    await expect(page.locator('[data-testid="review-card"]').first()).toContainText(/E2E seeded feedback 2|E2E seeded feedback 4|E2E seeded feedback 6|E2E visible feedback/);

    await page.getByTestId('review-filter-all').click();
    await expect(page.getByTestId('review-next-page')).toBeVisible();
    await page.getByTestId('review-next-page').click();
    await expect(page.getByTestId('review-page-indicator')).toContainText('2/');
  });
});
