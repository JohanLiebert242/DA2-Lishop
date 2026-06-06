import type { Metadata } from 'next';
import { getProductListFiltersFromSearchParams } from '@lishop/shared';
import { catalogApi } from '../../lib/catalog-api';
import { ProductListClient } from './product-list-client';

export const metadata: Metadata = {
  title: 'Sản phẩm — Lishop',
  description: 'Khám phá hàng nghìn sản phẩm chất lượng tại Lishop. Mua sắm dễ dàng, giao hàng nhanh chóng.',
};

interface ProductListPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function toUrlSearchParams(params: Record<string, string | string[] | undefined> = {}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) qs.append(key, item);
    } else if (value !== undefined) {
      qs.set(key, value);
    }
  }
  return qs;
}

export default async function ProductListPage({ searchParams }: ProductListPageProps) {
  const initialFilters = getProductListFiltersFromSearchParams(toUrlSearchParams(await searchParams));
  const [initialCategories, initialProducts] = await Promise.all([
    withTimeout(catalogApi.getCategories(), 5000, []).catch(() => []),
    withTimeout(
      catalogApi.getProducts({ sort: initialFilters.sort ?? 'newest', limit: 20, ...initialFilters }),
      5000,
      { items: [], nextCursor: null },
    ).catch(() => ({ items: [], nextCursor: null })),
  ]);

  return (
    <ProductListClient
      initialCategories={initialCategories}
      initialProducts={initialProducts}
      initialFilters={initialFilters}
    />
  );
}
