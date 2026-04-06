const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Request failed');
  return (json.data ?? json) as T;
}

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

export const promotionsApi = {
  getActiveFlashSales: () => apiFetch<FlashSaleInfo[]>('/promotions/flash-sales/active'),
};
