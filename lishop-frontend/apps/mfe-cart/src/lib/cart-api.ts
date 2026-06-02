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
  variantId: string | null;
  variantName: string | null;
  variantSku: string | null;
  variantAttributes: Record<string, string> | null;
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

  addItem: (productId: string, quantity: number, variantId?: string | null) =>
    apiFetch<CartData>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity, ...(variantId && { variantId }) }),
    }),

  updateItem: (productId: string, quantity: number, variantId?: string | null) =>
    apiFetch<CartData>(`/cart/items/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity, ...(variantId && { variantId }) }),
    }),

  removeItem: (productId: string, variantId?: string | null) => {
    const qs = variantId ? `?${new URLSearchParams({ variantId }).toString()}` : '';
    return apiFetch<CartData>(`/cart/items/${productId}${qs}`, { method: 'DELETE' });
  },

  applyCoupon: (code: string) =>
    apiFetch<CartData>('/cart/coupon', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  removeCoupon: () =>
    apiFetch<CartData>('/cart/coupon', { method: 'DELETE' }),
};
