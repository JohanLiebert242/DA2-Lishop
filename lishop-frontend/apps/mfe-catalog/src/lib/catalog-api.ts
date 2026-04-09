const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('lishop_at');
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Request failed');
  return (json.data ?? json) as T;
}

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

export interface CategoryItem extends CategoryInfo {
  imageUrl: string | null;
  parentId: string | null;
  children?: CategoryItem[];
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  priceVnd: number;
  priceUsd: number;
  stock: number;
  averageRating: number;
  reviewCount: number;
  categoryId: string;
  images: ProductImage[];
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
    if (params.q) qs.set('q', params.q);
    if (params.sort) qs.set('sort', params.sort);
    return apiFetch<ProductListResponse>(`/products?${qs}`);
  },

  getProduct: (slug: string) =>
    apiFetch<ProductDetail>(`/products/${slug}`),

  getFeatured: (limit = 8) =>
    apiFetch<ProductSummary[]>(`/products/featured?limit=${limit}`),

  getProductReviews: (productId: string) =>
    apiFetch<ReviewInfo[]>(`/reviews/product/${productId}`),

  createReview: (productId: string, rating: number, content?: string) =>
    apiFetch<ReviewInfo>(`/reviews/product/${productId}`, {
      method: 'POST',
      body: JSON.stringify({ rating, content }),
    }),
};
