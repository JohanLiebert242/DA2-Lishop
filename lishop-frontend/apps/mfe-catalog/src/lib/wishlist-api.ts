const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
const AUTH_URL = process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001';

export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return document.cookie.includes('lishop_session=');
}

async function doRequest(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers as Record<string, string>),
    },
  });
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await doRequest(path, init);

  // Auto-refresh on 401 then retry once (backend sets new httpOnly cookie)
  if (res.status === 401) {
    const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!refreshRes.ok) {
      window.location.href = `${AUTH_URL}/login`;
      throw new Error('Session expired');
    }
    res = await doRequest(path, init);
  }

  if (res.status === 204) return undefined as T;
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Request failed');
  return (json.data ?? json) as T;
}

export async function getWishlist(): Promise<string[]> {
  const data = await apiFetch<{ productIds: string[] }>('/wishlist');
  return data.productIds;
}

export async function addToWishlist(productId: string): Promise<void> {
  await apiFetch(`/wishlist/${productId}`, { method: 'POST' });
}

export async function removeFromWishlist(productId: string): Promise<void> {
  await apiFetch(`/wishlist/${productId}`, { method: 'DELETE' });
}
