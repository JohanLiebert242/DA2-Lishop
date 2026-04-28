const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
const AUTH_URL = process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)lishop_at=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function tryRefreshToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const json = await res.json();
    const token = (json.data ?? json).accessToken as string | undefined;
    if (token) {
      document.cookie = `lishop_at=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
    }
    return token ?? null;
  } catch {
    return null;
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const doRequest = (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let res = await doRequest(getToken());

  // Auto-refresh on 401 then retry once
  if (res.status === 401) {
    const newToken = await tryRefreshToken();
    if (!newToken) {
      window.location.href = `${AUTH_URL}/login`;
      throw new Error('Session expired');
    }
    res = await doRequest(newToken);
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
