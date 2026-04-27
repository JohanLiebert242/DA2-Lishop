const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)lishop_at=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Request failed');
  return (json.data ?? json) as T;
}

export interface CartItemData {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  quantity: number;
  priceVnd: number;
  priceUsd: number;
  stock: number;
}

export interface CartData {
  items: CartItemData[];
  subtotalVnd: number;
  subtotalUsd: number;
  couponCode: string | null;
  discountVnd: number;
  totalVnd: number;
}

export const cartApi = {
  getCart: () => apiFetch<CartData>('/cart'),

  addItem: (productId: string, quantity: number) =>
    apiFetch<CartData>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    }),

  updateItem: (productId: string, quantity: number) =>
    apiFetch<CartData>(`/cart/items/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),

  removeItem: (productId: string) =>
    apiFetch<CartData>(`/cart/items/${productId}`, { method: 'DELETE' }),

  applyCoupon: (code: string) =>
    apiFetch<CartData>('/cart/coupon', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  removeCoupon: () =>
    apiFetch<CartData>('/cart/coupon', { method: 'DELETE' }),
};
