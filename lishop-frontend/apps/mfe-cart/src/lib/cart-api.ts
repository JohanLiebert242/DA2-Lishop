import { createApiFetch } from '@lishop/shared';

const apiFetch = createApiFetch(
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000',
  process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001',
);

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
