import { createApiFetch } from '@lishop/shared';

const apiFetch = createApiFetch(
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000',
  process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001',
);

export interface FlashSaleProductInfo {
  id: string;
  name: string;
  slug: string;
  priceVnd: number;
  images: { url: string }[];
}

export interface FlashSaleItemInfo {
  id: string;
  discountPercent: number;
  product: FlashSaleProductInfo;
}

export interface FlashSaleInfo {
  id: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
  items: FlashSaleItemInfo[];
}

export interface PublicCoupon {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED' | 'FREE_SHIPPING';
  value: number;
  minOrderVnd: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
}

export const promotionsApi = {
  getActiveFlashSales: () => apiFetch<FlashSaleInfo[]>('/promotions/flash-sales/active'),
  getPublicCoupons: () => apiFetch<PublicCoupon[]>('/promotions/coupons'),
};
