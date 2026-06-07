import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API_URL = process.env['E2E_API_URL'] ?? 'http://127.0.0.1:4000';
const PROFILE_URL = process.env['E2E_PROFILE_URL'] ?? 'http://localhost:3006';
const PASSWORD = 'Customer@123';

async function unwrap<T>(response: { json(): Promise<unknown> }): Promise<T> {
  const json = await response.json();
  return (json.data ?? json) as T;
}

async function registerCustomer(request: APIRequestContext) {
  const email = `e2e-support-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@lishop.vn`;
  const register = await request.post(`${API_URL}/auth/register`, {
    data: {
      email,
      password: PASSWORD,
      firstName: 'Support',
      lastName: 'Tester',
    },
  });
  expect(register.ok()).toBeTruthy();

  const login = await request.post(`${API_URL}/auth/login`, {
    data: { email, password: PASSWORD },
  });
  expect(login.ok()).toBeTruthy();
  const data = await unwrap<{ accessToken: string }>(login);
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

test.describe('profile support', () => {
  test('FAQ page shows seeded default questions', async ({ page, request }) => {
    const customer = await registerCustomer(request);
    await addLoginCookies(page, customer.accessToken);

    await page.goto(`${PROFILE_URL}/support/faq`);

    await expect(page.getByTestId('support-faq-item').first()).toBeVisible();
    expect(await page.getByTestId('support-faq-item').count()).toBeGreaterThanOrEqual(10);
  });

  test('customer can create a support ticket without server error', async ({ page, request }) => {
    const customer = await registerCustomer(request);
    await addLoginCookies(page, customer.accessToken);

    await page.goto(`${PROFILE_URL}/support`);
    await page.getByTestId('support-create-open').first().click();
    await page.getByTestId('support-ticket-category').selectOption('ORDER');
    await page.getByTestId('support-ticket-subject').fill('Can kiem tra don hang e2e');
    await page
      .getByTestId('support-ticket-description')
      .fill('Khach hang can bo phan ho tro kiem tra tinh trang don hang trong e2e.');
    await page.getByTestId('support-ticket-submit').click();

    await expect(page.getByText('Can kiem tra don hang e2e')).toBeVisible();

    const tickets = await request.get(`${API_URL}/support/tickets`, {
      headers: { Authorization: `Bearer ${customer.accessToken}` },
    });
    expect(tickets.ok()).toBeTruthy();
    const data = await unwrap<Array<{ subject: string }>>(tickets);
    expect(data.some((ticket) => ticket.subject === 'Can kiem tra don hang e2e')).toBe(true);
  });
});
