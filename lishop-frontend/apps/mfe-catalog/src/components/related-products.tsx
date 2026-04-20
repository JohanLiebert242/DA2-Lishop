'use client';

import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '../lib/catalog-api';
import { ProductCard } from './product-card';

export function RelatedProducts({ slug }: { slug: string }) {
  const { data: related = [], isLoading } = useQuery({
    queryKey: ['related', slug],
    queryFn: () => catalogApi.getRelatedProducts(slug),
  });

  if (isLoading) {
    return (
      <div className="mt-12 border-t pt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Sản phẩm liên quan</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (related.length === 0) return null;

  return (
    <div className="mt-12 border-t pt-8">
      <h2 className="mb-6 text-lg font-semibold text-gray-900">Sản phẩm liên quan</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {related.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
