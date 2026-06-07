const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...init,
  });
  if (res.status === 204) return undefined as T;
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message ?? json.error ?? 'Yêu cầu không thành công');
  }
  // Backend wraps responses in { data: ... }
  return (json.data ?? json) as T;
}

export interface AuthTokens {
  accessToken: string;
}

export interface RegisterResponse {
  message: string;
}

export const authApi = {
  register: (body: { email: string; password: string; firstName: string; lastName: string }) =>
    apiFetch<RegisterResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    apiFetch<AuthTokens>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  verifyEmail: (token: string) =>
    apiFetch<void>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),

  forgotPassword: (email: string) =>
    apiFetch<void>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (token: string, password: string) =>
    apiFetch<void>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
};
