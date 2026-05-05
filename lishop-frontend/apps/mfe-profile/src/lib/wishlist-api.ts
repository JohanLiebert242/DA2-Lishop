const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
const AUTH_URL = process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001';

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

export interface WishlistProduct {
  id: string;
  name: string;
  slug: string;
  priceVnd: number;
  stock: number;
  averageRating: number;
  reviewCount: number;
  category: { id: string; name: string; slug: string };
  images: { id: string; url: string; alt: string | null; isPrimary: boolean }[];
}

export async function getWishlistProducts(): Promise<WishlistProduct[]> {
  return apiFetch<WishlistProduct[]>('/wishlist/products');
}

export async function removeFromWishlist(productId: string): Promise<void> {
  await apiFetch(`/wishlist/${productId}`, { method: 'DELETE' });
}
