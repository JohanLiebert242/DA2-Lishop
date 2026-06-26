import { createApiFetch } from '@lishop/shared';

const apiFetch = createApiFetch(
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000',
  process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001',
);

export interface SellerShop {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  phone: string | null;
  address: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  approvedAt: string | null;
  createdAt: string;
  _count: { products: number };
}

export interface SellerProduct {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string;
  priceVnd: number;
  priceUsd: number;
  stock: number;
  weightGrams: number;
  averageRating: number;
  reviewCount: number;
  categoryId: string;
  shopId: string | null;
  createdAt: string;
  category: { id: string; name: string; slug: string };
  images: { id: string; url: string; alt: string | null; isPrimary: boolean }[];
}

export interface CreateSellerProductInput {
  name: string;
  description: string;
  priceVnd: number;
  priceUsd: number;
  stock: number;
  categoryId: string;
  sku?: string;
  weightGrams?: number;
  images?: { url: string; alt?: string; isPrimary?: boolean }[];
  tags?: string[];
}

export interface SellerOrderItem {
  id: string;
  productId: string;
  productName: string;
  variantName: string | null;
  variantSku: string | null;
  quantity: number;
  unitPriceVnd: number;
  totalPriceVnd: number;
  productSlug: string | null;
}

export interface SellerOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalVnd: number;
  createdAt: string;
  items: SellerOrderItem[];
  user: { email: string; firstName: string; lastName: string };
  payment: { method: string; amountVnd: number; status: string } | null;
  address: { fullName: string; phone: string; city: string };
}

export interface SellerOrderDetail extends SellerOrder {}

export const sellerApi = {
  // Shop
  getMyShop: () => apiFetch<SellerShop>('/shops/me'),
  updateShop: (data: Partial<{ name: string; description: string; phone: string; address: string; logoUrl: string; bannerUrl: string }>) =>
    apiFetch<SellerShop>('/shops/me', { method: 'PATCH', body: JSON.stringify(data) }),

  // Products
  getMyProducts: (params?: { limit?: number; cursor?: string }) => {
    const search = new URLSearchParams();
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.cursor) search.set('cursor', params.cursor);
    const qs = search.toString();
    return apiFetch<{ items: SellerProduct[]; nextCursor: string | null }>(`/seller/products${qs ? `?${qs}` : ''}`);
  },
  createProduct: (data: CreateSellerProductInput) =>
    apiFetch<SellerProduct>('/seller/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Partial<CreateSellerProductInput>) =>
    apiFetch<SellerProduct>(`/seller/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProduct: (id: string) =>
    apiFetch<void>(`/seller/products/${id}`, { method: 'DELETE' }),

  // Orders
  getOrders: () => apiFetch<SellerOrder[]>('/seller/orders'),
  getOrderDetail: (id: string) => apiFetch<SellerOrderDetail>(`/seller/orders/${id}`),
};
