'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@lishop/shared';
import { catalogApi } from '../../lib/catalog-api';
import { ProductCard } from '../../components/product-card';
import { CategorySidebar } from '../../components/category-sidebar';
import { ProductFilters } from '../../components/product-filters';

export default function ProductListPage() {
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [sort, setSort] = useState('newest');
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();
  const debouncedQ = useDebounce(q, 400);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => catalogApi.getCategories(),
  });

  const { data, isFetching } = useQuery({
    queryKey: ['products', { categoryId, sort, q: debouncedQ, cursor }],
    queryFn: () => catalogApi.getProducts({ categoryId, sort: sort as any, q: debouncedQ, cursor }),
  });

  const handleCategoryChange = useCallback((id: string | undefined) => {
    setCategoryId(id);
    setCursor(undefined);
  }, []);

  const items = data?.items ?? [];
  const nextCursor = data?.nextCursor;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Tất cả sản phẩm</h1>

      <div className="flex gap-8">
        <CategorySidebar
          categories={categories}
          selectedId={categoryId}
          onSelect={handleCategoryChange}
        />

        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <ProductFilters
              sort={sort}
              q={q}
              onSortChange={setSort}
              onQChange={setQ}
            />
            {isFetching && <span className="text-sm text-gray-400">Đang tải...</span>}
          </div>

          {items.length === 0 && !isFetching ? (
            <div className="flex h-48 items-center justify-center text-gray-400">
              Không tìm thấy sản phẩm phù hợp
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {nextCursor && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setCursor(nextCursor)}
                disabled={isFetching}
                className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isFetching ? 'Đang tải...' : 'Xem thêm'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
