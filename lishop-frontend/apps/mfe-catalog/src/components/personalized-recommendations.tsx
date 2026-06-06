'use client';

import { useQuery } from '@tanstack/react-query';
import type { AiDiscoveryProduct, ProductSummary } from '../lib/catalog-api';
import { catalogApi } from '../lib/catalog-api';
import { ProductCard } from './product-card';

interface PersonalizedRecommendationsProps {
  context: 'products' | 'home';
  limit?: number;
}

function toProductSummary(product: AiDiscoveryProduct): ProductSummary {
  return {
    ...product,
    sku: null,
    priceUsd: 0,
    categoryId: product.category.id,
    variants: [],
    tags: [],
    createdAt: '',
  };
}

function PersonalizedRecommendationSkeleton() {
  return (
    <section
      data-testid="personalized-recs"
      className="mb-6 rounded-lg border border-stone-200 bg-white px-4 py-4 shadow-sm"
    >
      <div className="animate-pulse">
        <div className="h-4 w-44 rounded bg-stone-200" />
        <div className="mt-2 h-3 w-72 max-w-full rounded bg-stone-100" />
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-64 rounded-xl bg-stone-100" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function PersonalizedRecommendations({
  context,
  limit = 8,
}: PersonalizedRecommendationsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['personalized-recommendations', context, limit],
    queryFn: () => catalogApi.getRecommendations(limit, context),
  });

  if (isLoading) {
    return <PersonalizedRecommendationSkeleton />;
  }

  if (!data || data.items.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="personalized-recs"
      className="mb-6 rounded-lg border border-stone-200 bg-white px-4 py-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-black uppercase tracking-wide text-stone-900">
          Danh cho ban
        </h2>
        {data.fallback && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
            Fallback
          </span>
        )}
      </div>
      {data.reason && (
        <p className="mt-2 text-sm leading-6 text-stone-600">{data.reason}</p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {data.items.map((product) => (
          <div
            key={product.id}
            data-testid={`personalized-rec-item-${product.slug}`}
          >
            <ProductCard product={toProductSummary(product)} />
          </div>
        ))}
      </div>
    </section>
  );
}
