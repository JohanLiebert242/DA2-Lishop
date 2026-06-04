import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API_URL = process.env['E2E_API_URL'] ?? 'http://127.0.0.1:4000';
const PROFILE_URL = process.env['E2E_PROFILE_URL'] ?? 'http://localhost:3006';
const PASSWORD = 'Customer@123';

type Address = {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
};

async function unwrap<T>(response: { json(): Promise<unknown> }): Promise<T> {
  const json = await response.json();
  return (json.data ?? json) as T;
}

async function registerCustomer(request: APIRequestContext) {
  const email = `e2e-address-${Date.now()}@lishop.vn`;
  const response = await request.post(`${API_URL}/auth/register`, {
    data: {
      email,
      password: PASSWORD,
      firstName: 'Address',
      lastName: 'Tester',
    },
  });

  expect(response.ok()).toBeTruthy();
  const data = await unwrap<{ accessToken: string }>(response);
  return { email, accessToken: data.accessToken };
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

async function mockMapServices(page: Page) {
  await page.route('https://tile.openstreetmap.org/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
        'base64',
      ),
    });
  });

  await page.route('https://nominatim.openstreetmap.org/search?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          place_id: 101,
          display_name: '123 Nguyen Hue, Ben Nghe, District 1, Ho Chi Minh City, Viet Nam',
          lat: '10.77584',
          lon: '106.70175',
          address: {
            house_number: '123',
            road: 'Nguyen Hue',
            suburb: 'Ben Nghe',
            city_district: 'District 1',
            city: 'Ho Chi Minh City',
            country: 'Viet Nam',
          },
        },
      ]),
    });
  });

  await page.route('https://nominatim.openstreetmap.org/reverse?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        place_id: 202,
        display_name: '45 Le Loi, Ben Thanh, District 1, Ho Chi Minh City, Viet Nam',
        lat: '10.77310',
        lon: '106.70020',
        address: {
          house_number: '45',
          road: 'Le Loi',
          suburb: 'Ben Thanh',
          city_district: 'District 1',
          city: 'Ho Chi Minh City',
          country: 'Viet Nam',
        },
      }),
    });
  });
}

test.describe('shipping addresses', () => {
  test('customer can use autocomplete, pick the map, and save coordinates', async ({ page, request }) => {
    const customer = await registerCustomer(request);
    await addLoginCookies(page, customer.accessToken);
    await mockMapServices(page);

    await page.goto(`${PROFILE_URL}/addresses`);
    await expect(page.getByRole('heading', { name: 'Dia chi giao hang' })).toBeVisible();

    await page.getByRole('button', { name: /Them dia chi/ }).click();
    await page.getByPlaceholder('Nguyen Van A').fill('E2E Address Tester');
    await page.getByPlaceholder('0912 345 678').fill('0901234567');

    await page.getByPlaceholder('Nhap so nha, duong, phuong, quan, thanh pho').fill('123 Nguyen Hue District 1');
    await page.getByRole('button', { name: 'Tim', exact: true }).click();
    await page.getByText('123 Nguyen Hue, Ben Nghe, District 1').click();

    await expect(page.getByPlaceholder('Chon tu goi y hoac ban do')).toHaveValue('123 Nguyen Hue');
    await expect(page.getByPlaceholder('Quan 1')).toHaveValue('District 1');
    await expect(page.getByPlaceholder('Ho Chi Minh')).toHaveValue('Ho Chi Minh City');
    await expect(page.getByText('Da gan toa do giao hang: 10.77584, 106.70175')).toBeVisible();

    await page.getByRole('button', { name: 'Chon vi tri tren ban do' }).click({ position: { x: 180, y: 110 } });
    await expect(page.getByPlaceholder('Chon tu goi y hoac ban do')).toHaveValue('45 Le Loi');
    const pickedCoordinateText = page.getByText(/Da gan toa do giao hang:/);
    await expect(pickedCoordinateText).toBeVisible();
    const coordinateMatch = (await pickedCoordinateText.textContent())?.match(/([\d.]+),\s*([\d.]+)/);
    expect(coordinateMatch).toBeTruthy();
    const pickedLatitude = Number(coordinateMatch![1]);
    const pickedLongitude = Number(coordinateMatch![2]);

    await page.getByRole('button', { name: 'Luu dia chi' }).click();
    await expect(page.getByText('E2E Address Tester')).toBeVisible();
    await expect(page.getByText('45 Le Loi, District 1, Ho Chi Minh City')).toBeVisible();

    const addressesResponse = await request.get(`${API_URL}/addresses`, {
      headers: { Authorization: `Bearer ${customer.accessToken}` },
    });
    expect(addressesResponse.ok()).toBeTruthy();
    const addresses = await unwrap<Address[]>(addressesResponse);
    const saved = addresses.find((address) => address.fullName === 'E2E Address Tester');

    expect(saved).toBeTruthy();
    expect(saved!.street).toBe('45 Le Loi');
    expect(saved!.district).toBe('District 1');
    expect(saved!.city).toBe('Ho Chi Minh City');
    expect(saved!.latitude).toBeCloseTo(pickedLatitude, 4);
    expect(saved!.longitude).toBeCloseTo(pickedLongitude, 4);
  });
});
