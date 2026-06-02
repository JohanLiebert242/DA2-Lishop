import { createApiFetch } from '@lishop/shared';

const apiFetch = createApiFetch(
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000',
  process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001',
);

export interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
}

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string;
  priceVnd: number;
  priceUsd: number;
  stock: number;
  weightGrams: number;
  attributes: Record<string, string>;
  imageUrl: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface CategoryItem extends CategoryInfo {
  imageUrl: string | null;
  parentId: string | null;
  children?: CategoryItem[];
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  priceVnd: number;
  priceUsd: number;
  stock: number;
  averageRating: number;
  reviewCount: number;
  categoryId: string;
  images: ProductImage[];
  variants: ProductVariant[];
  tags: { tag: { name: string } }[];
  category: CategoryInfo;
  createdAt: string;
}

export interface ProductDetail extends ProductSummary {
  description: string;
}

export interface ProductListResponse {
  items: ProductSummary[];
  nextCursor: string | null;
}

export interface ProductListParams {
  cursor?: string;
  limit?: number;
  categoryId?: string;
  minPriceVnd?: number;
  maxPriceVnd?: number;
  brand?: string;
  minRating?: number;
  inStock?: boolean;
  onSale?: boolean;
  freeShipping?: boolean;
  q?: string;
  sort?: 'price_asc' | 'price_desc' | 'rating_desc' | 'newest';
}

export interface ReviewInfo {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  content: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export const catalogApi = {
  getCategories: () =>
    apiFetch<CategoryItem[]>('/categories'),

  getProducts: (params: ProductListParams = {}) => {
    const qs = new URLSearchParams();
    if (params.cursor) qs.set('cursor', params.cursor);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.categoryId) qs.set('categoryId', params.categoryId);
    if (params.minPriceVnd !== undefined) qs.set('minPriceVnd', String(params.minPriceVnd));
    if (params.maxPriceVnd !== undefined) qs.set('maxPriceVnd', String(params.maxPriceVnd));
    if (params.brand) qs.set('brand', params.brand);
    if (params.minRating !== undefined) qs.set('minRating', String(params.minRating));
    if (params.inStock) qs.set('inStock', 'true');
    if (params.onSale) qs.set('onSale', 'true');
    if (params.freeShipping) qs.set('freeShipping', 'true');
    if (params.q) qs.set('q', params.q);
    if (params.sort) qs.set('sort', params.sort);
    return apiFetch<ProductListResponse>(`/products?${qs}`);
  },

  getProduct: (slug: string) =>
    apiFetch<ProductDetail>(`/products/${slug}`),

  getFeatured: (limit = 8) =>
    apiFetch<ProductSummary[]>(`/products/featured?limit=${limit}`),

  getRelatedProducts: (slug: string) =>
    apiFetch<ProductSummary[]>(`/products/${slug}/related`),

  getProductReviews: (productId: string) =>
    apiFetch<ReviewInfo[]>(`/reviews/product/${productId}`),

  createReview: (productId: string, rating: number, content?: string) =>
    apiFetch<ReviewInfo>(`/reviews/product/${productId}`, {
      method: 'POST',
      body: JSON.stringify({ rating, content }),
    }),
};
