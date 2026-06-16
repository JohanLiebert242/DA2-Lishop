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

async function getShopStats(request: APIRequestContext, brand?: string) {
  const qs = new URLSearchParams({ limit: '100', sort: 'newest' });
  if (brand) qs.set('brand', brand);
  const response = await request.get(`${API_URL}/products?${qs.toString()}`);
  expect(response.ok()).toBeTruthy();
  const products = await unwrap<ProductListResponse>(response);

  return {
    productCount: products.items.length,
    categoryCount: new Set(products.items.map((product) => product.category.name)).size,
    variantCount: products.items.reduce((sum, product) => sum + product.variants.length, 0),
  };
}

function statPattern(label: string, value: number) {
  const formatted = value.toLocaleString('vi-VN').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(${escapedLabel}\\s*${formatted}|${formatted}\\s*${escapedLabel})`);
}

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
      // This suite creates multiple delivered purchases for the same product to unlock "verified purchase" reviews.
      // Pick a product that can survive the stock consumption across those flows.
      return item.brand && item.images.length >= 2 && item.variants.length >= 2 && variantImages.size >= 2 && maxVariantStock >= 8;
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

function getVariantCombo(product: ProductSummary) {
  const attributeValues = new Map<string, Set<string>>();

  for (const variant of product.variants) {
    for (const [key, value] of Object.entries(variant.attributes ?? {})) {
      if (!value) continue;
      const values = attributeValues.get(key) ?? new Set<string>();
      values.add(value);
      attributeValues.set(key, values);
    }
  }

  const candidateKeys = Array.from(attributeValues.entries())
    .filter(([, values]) => values.size > 1)
    .map(([key]) => key);

  for (let i = 0; i < candidateKeys.length; i += 1) {
    for (let j = i + 1; j < candidateKeys.length; j += 1) {
      const firstKey = candidateKeys[i];
      const secondKey = candidateKeys[j];
      const inStockVariants = product.variants.filter((variant) => variant.stock > 0);
      const firstValues = Array.from(attributeValues.get(firstKey) ?? []);
      const secondValues = Array.from(attributeValues.get(secondKey) ?? []);

      for (const firstValue of firstValues) {
        for (const secondValue of secondValues) {
          const matched = inStockVariants.find(
            (variant) =>
              variant.attributes?.[firstKey] === firstValue
              && variant.attributes?.[secondKey] === secondValue,
          );

          if (!matched) continue;

          const alternateFirst = inStockVariants.find(
            (variant) =>
              variant.attributes?.[firstKey] !== firstValue
              && variant.attributes?.[secondKey] === secondValue,
          );
          const alternateSecond = inStockVariants.find(
            (variant) =>
              variant.attributes?.[firstKey] === firstValue
              && variant.attributes?.[secondKey] !== secondValue,
          );

          if (alternateFirst && alternateSecond) {
            return {
              firstKey,
              firstValue,
              secondKey,
              secondValue,
              matchedVariant: matched,
            };
          }
        }
      }
    }
  }

  return null;
}

function getVariantSwitchScenario(product: ProductSummary) {
  const inStockVariants = product.variants.filter(
    (variant) => variant.stock > 0 && Object.keys(variant.attributes ?? {}).length >= 2,
  );
  const keys = Array.from(new Set(inStockVariants.flatMap((variant) => Object.keys(variant.attributes ?? {}))));

  for (const changedKey of keys) {
    for (const fromVariant of inStockVariants) {
      for (const toVariant of inStockVariants) {
        if (fromVariant.id === toVariant.id) continue;
        if (fromVariant.attributes?.[changedKey] === toVariant.attributes?.[changedKey]) continue;

        const desiredAttributes = { ...fromVariant.attributes, [changedKey]: toVariant.attributes[changedKey] };
        const exactMatch = inStockVariants.find((variant) =>
          keys.every((key) => variant.attributes?.[key] === desiredAttributes[key]),
        );

        if (!exactMatch) {
          return { changedKey, fromVariant, toVariant };
        }
      }
    }
  }

  return null;
}

async function getSparseVariantProduct(request: APIRequestContext) {
  let cursor: string | null = null;

  for (let page = 0; page < 5; page += 1) {
    const response = await request.get(`${API_URL}/products?limit=100${cursor ? `&cursor=${cursor}` : ''}`);
    expect(response.ok()).toBeTruthy();
    const products = await unwrap<ProductListResponse>(response);

    for (const product of products.items) {
      const scenario = getVariantSwitchScenario(product);
      if (scenario) {
        return { product, ...scenario };
      }
    }

    cursor = products.nextCursor ?? null;
    if (!cursor) break;
  }

  throw new Error('seeded catalog should include a product with sparse variant combinations');
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
  const loginResponse = await request.post(`${API_URL}/auth/login`, {
    data: { email, password: PASSWORD },
  });
  expect(loginResponse.ok()).toBeTruthy();
  const data = await unwrap<{ accessToken: string }>(loginResponse);
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
    const variantCombo = getVariantCombo(product);

    await expect(page.getByTestId('product-main-image')).toBeVisible();
    await page.getByRole('button', { name: selectableValue, exact: true }).click();
    await expect(page.getByTestId('product-main-image')).toHaveAttribute('src', new RegExp(encodeURIComponent(expectedImageUrl).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

    if (variantCombo) {
      await page.getByRole('button', { name: variantCombo.firstValue, exact: true }).click();
      await page.getByRole('button', { name: variantCombo.secondValue, exact: true }).click();
      await expect(page.getByText('Tùy chọn này hiện chưa có sẵn. Hãy chọn tổ hợp khác.')).toHaveCount(0);
      await expect(
        page.getByText(
          new RegExp(`${variantCombo.matchedVariant.attributes[variantCombo.firstKey]}\\s*\\/\\s*${variantCombo.matchedVariant.attributes[variantCombo.secondKey]}`),
        ),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: variantCombo.firstValue, exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('button', { name: variantCombo.secondValue, exact: true })).toHaveAttribute('aria-pressed', 'true');
    }

    await page.getByTestId('shop-profile-link').click();
    await expect(page).toHaveURL(/\/shops\//);
    await expect(page.locator('[data-testid="shop-product-card"]').first()).toBeVisible();
    await page.getByTestId('shop-back-to-product').click();
    await expect(page).toHaveURL(new RegExp(`/products/${product.slug}$`));

    await page.goto(`${CATALOG_URL}/products/${product.slug}`);
    await expect(page.locator('[data-testid="description-image"]').first()).toBeVisible();
    await expect(page.getByText('Mô tả sản phẩm')).toBeVisible();
    await expect(page.getByText('AI chọn cỡ')).toHaveCount(0);

    await page.getByTestId('write-review-button').click();
    await page.getByTestId('review-content').fill('E2E visible feedback with media');
    await expect(page.getByText('Media URL')).toHaveCount(0);
    await page.getByTestId('review-media-upload').setInputFiles({
      name: 'visible-review.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      ),
    });
    await expect(page.locator('[data-testid="review-upload-preview-image"]')).toBeVisible();
    await page.getByTestId('submit-review-button').click();
    await expect(page.getByText('E2E visible feedback with media')).toBeVisible();
    await expect(page.locator('[data-testid="review-media-image"]').first()).toBeVisible();
    await expect(page.getByText('Xem media')).toHaveCount(0);

    await page.getByTestId('review-filter-5').click();
    await expect(page.locator('[data-testid="review-card"]').first()).toContainText(/E2E seeded feedback 2|E2E seeded feedback 4|E2E seeded feedback 6|E2E visible feedback/);

    await page.getByTestId('review-filter-all').click();
    await expect(page.getByTestId('review-next-page')).toBeVisible();
    await page.getByTestId('review-next-page').click();
    await expect(page.getByTestId('review-page-indicator')).toContainText('2/');
  });

  test('product detail keeps selection on a valid variant when a new attribute breaks the current combination', async ({ page, request }) => {
    const scenario = await getSparseVariantProduct(request);

    await page.goto(`${CATALOG_URL}/products/${scenario.product.slug}`);

    for (const value of Object.values(scenario.fromVariant.attributes)) {
      await page.getByRole('button', { name: value, exact: true }).click();
    }

    await page.getByRole('button', { name: scenario.toVariant.attributes[scenario.changedKey], exact: true }).click();

    await expect(page.getByText('Tùy chọn này hiện chưa có sẵn. Hãy chọn tổ hợp khác.')).toHaveCount(0);
    await expect(
      page.locator('span').filter({
        hasText: new RegExp(
          Object.values(scenario.toVariant.attributes)
            .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('\\s*\\/\\s*'),
        ),
      }),
    ).toBeVisible();
  });

  test('product detail shop summary matches the linked shop page', async ({ page, request }) => {
    const product = await getVariantProduct(request);
    const expectedShopName = product.brand ? `Cửa hàng ${product.brand}` : 'Cửa hàng chính hãng Lishop';
    const expectedStats = await getShopStats(request, product.brand);

    await page.goto(`${CATALOG_URL}/products/${product.slug}`);

    const shopSection = page.getByTestId('product-shop-section');
    await expect(shopSection.getByRole('heading', { name: expectedShopName })).toBeVisible();
    await expect(shopSection).toContainText(statPattern('Sản phẩm', expectedStats.productCount));
    await expect(shopSection).toContainText(statPattern('Danh mục', expectedStats.categoryCount));
    await expect(shopSection).toContainText(statPattern('Biến thể', expectedStats.variantCount));

    await shopSection.getByTestId('shop-profile-link').click();

    await expect(page).toHaveURL(/\/shops\//);
    const shopHeader = page.locator('section').first();
    await expect(page.getByRole('heading', { name: expectedShopName })).toBeVisible();
    await expect(shopHeader).toContainText(statPattern('Sản phẩm', expectedStats.productCount));
    await expect(shopHeader).toContainText(statPattern('Danh mục', expectedStats.categoryCount));
    await expect(shopHeader).toContainText(statPattern('Biến thể', expectedStats.variantCount));
  });

  test('review media uploads use a public URL instead of embedding base64 content', async ({ page, request }) => {
    const product = await getVariantProduct(request);
    const reviewer = await registerCustomer(request, 'review-upload-url');
    const purchasableVariant = product.variants.find((variant) => variant.stock > 0) ?? product.variants[0];
    await createDeliveredPurchase(request, reviewer.accessToken, product.id, purchasableVariant?.id);
    await addLoginCookies(page, reviewer.accessToken);

    await page.route('**/support/uploads', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            url: '/uploads/support/test-user/review-image.png',
            mime: 'image/png',
          },
        }),
      });
    });

    let submittedContent = '';
    await page.route(`**/reviews/product/${product.id}`, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      const body = route.request().postDataJSON() as { content?: string; rating?: number };
      submittedContent = body.content ?? '';
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'review-uploaded',
            userId: reviewer.accessToken,
            userName: 'E2E Upload',
            rating: body.rating ?? 5,
            content: submittedContent,
            verifiedPurchase: true,
            createdAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto(`${CATALOG_URL}/products/${product.slug}`);
    await page.getByTestId('write-review-button').click();
    await page.getByTestId('review-content').fill('Đánh giá tốt');
    await page.getByTestId('review-media-upload').setInputFiles({
      name: 'review-large-enough.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAY0lEQVR4nO3PQQ0AIBDAsAP/nuGNAvZoFSzZnpl5Z+1n7QH8Z0wGmAwQGSAyQGSAyQCRASIDRAaIDBAZIDJAZIDIAJEBIgNEBogMEBkgMkBkgMgAkQEiA0QGiAwQGSB6AK+GAU2R1v+VAAAAAElFTkSuQmCC',
        'base64',
      ),
    });
    await page.getByTestId('submit-review-button').click();

    await expect.poll(() => submittedContent).toContain('/uploads/support/test-user/review-image.png');
    expect(submittedContent).not.toContain('data:image/');
    await expect(page.locator('[data-testid="review-media-image"]').first()).toBeVisible();
  });
});
