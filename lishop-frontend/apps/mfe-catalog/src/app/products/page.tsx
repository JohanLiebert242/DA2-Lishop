import type { Metadata } from 'next';
import { catalogApi } from '../../lib/catalog-api';
import { ProductListClient } from './product-list-client';

export const metadata: Metadata = {
  title: 'Sản phẩm — Lishop',
  description: 'Khám phá hàng nghìn sản phẩm chất lượng tại Lishop. Mua sắm dễ dàng, giao hàng nhanh chóng.',
};

export default async function ProductListPage() {
  const [initialCategories, initialProducts] = await Promise.all([
    catalogApi.getCategories().catch(() => []),
    catalogApi.getProducts({ sort: 'newest', limit: 20 }).catch(() => ({ items: [], nextCursor: null })),
  ]);

  return (
    <ProductListClient
      initialCategories={initialCategories}
      initialProducts={initialProducts}
    />
  );
}
