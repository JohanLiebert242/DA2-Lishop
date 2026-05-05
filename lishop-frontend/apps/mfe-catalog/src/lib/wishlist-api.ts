import { createApiFetch } from '@lishop/shared';

export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return document.cookie.includes('lishop_session=');
}

const apiFetch = createApiFetch(
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000',
  process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001',
);

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
