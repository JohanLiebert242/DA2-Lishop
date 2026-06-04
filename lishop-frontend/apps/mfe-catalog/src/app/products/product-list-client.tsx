'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@lishop/shared';
import type { ProductListUrlFilters } from '@lishop/shared';
import { catalogApi, CategoryItem, ProductListParams, ProductListResponse } from '../../lib/catalog-api';
import { ProductCard } from '../../components/product-card';
import { CategorySidebar } from '../../components/category-sidebar';
import { ProductFilters } from '../../components/product-filters';

interface Props {
  initialCategories: CategoryItem[];
  initialProducts: ProductListResponse;
  initialFilters: ProductListUrlFilters;
}

export function ProductListClient({ initialCategories, initialProducts, initialFilters }: Props) {
  const [categoryId, setCategoryId] = useState<string | undefined>(initialFilters.categoryId);
  const [sort, setSort] = useState<string>(initialFilters.sort ?? 'newest');
  const [q, setQ] = useState(initialFilters.q ?? '');
  const [brand, setBrand] = useState(initialFilters.brand ?? '');
  const [minPriceVnd, setMinPriceVnd] = useState('');
  const [maxPriceVnd, setMaxPriceVnd] = useState('');
  const [minRating, setMinRating] = useState('');
  const [inStock, setInStock] = useState(false);
  const [onSale, setOnSale] = useState(false);
  const [freeShipping, setFreeShipping] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const debouncedQ = useDebounce(q, 400);
  const debouncedMinPrice = useDebounce(minPriceVnd, 400);
  const debouncedMaxPrice = useDebounce(maxPriceVnd, 400);

  const numericMinPrice = debouncedMinPrice ? Number(debouncedMinPrice) : undefined;
  const numericMaxPrice = debouncedMaxPrice ? Number(debouncedMaxPrice) : undefined;
  const numericMinRating = minRating ? Number(minRating) : undefined;

  const isDefaultQuery = !categoryId && sort === 'newest' && !debouncedQ && !brand && !numericMinPrice && !numericMaxPrice && !numericMinRating && !inStock && !onSale && !freeShipping && !cursor;

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => catalogApi.getCategories(),
    initialData: initialCategories,
    staleTime: 5 * 60_000,
  });

  const { data, isFetching } = useQuery({
    queryKey: ['products', { categoryId, sort, q: debouncedQ, brand, numericMinPrice, numericMaxPrice, numericMinRating, inStock, onSale, freeShipping, cursor }],
    queryFn: () => catalogApi.getProducts({
      categoryId,
      sort: sort as ProductListParams['sort'],
      q: debouncedQ,
      brand,
      minPriceVnd: numericMinPrice,
      maxPriceVnd: numericMaxPrice,
      minRating: numericMinRating,
      inStock,
      onSale,
      freeShipping,
      cursor,
    }),
    initialData: isDefaultQuery ? initialProducts : undefined,
    staleTime: 60_000,
  });

  const handleCategoryChange = useCallback((id: string | undefined) => {
    setCategoryId(id);
    setCursor(undefined);
  }, []);

  const handleFilterChange = useCallback(<T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setCursor(undefined);
  }, []);

  const handleResetFilters = useCallback(() => {
    setCategoryId(undefined);
    setSort('newest');
    setQ('');
    setBrand('');
    setMinPriceVnd('');
    setMaxPriceVnd('');
    setMinRating('');
    setInStock(false);
    setOnSale(false);
    setFreeShipping(false);
    setCursor(undefined);
  }, []);

  const items = data?.items ?? [];
  const nextCursor = data?.nextCursor;

  return (
    <div className="min-h-screen bg-warm">
      <div className="bg-white border-b border-warm">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">Tất cả sản phẩm</h1>
          <p className="mt-1 text-sm text-muted">Khám phá hàng nghìn sản phẩm chất lượng</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex gap-7">
          <CategorySidebar
            categories={categories}
            selectedId={categoryId}
            onSelect={handleCategoryChange}
          />

          <div className="flex-1 min-w-0">
            <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
              <ProductFilters
                sort={sort}
                q={q}
                brand={brand}
                minPriceVnd={minPriceVnd}
                maxPriceVnd={maxPriceVnd}
                minRating={minRating}
                inStock={inStock}
                onSale={onSale}
                freeShipping={freeShipping}
                onSortChange={handleFilterChange(setSort)}
                onQChange={handleFilterChange(setQ)}
                onBrandChange={handleFilterChange(setBrand)}
                onMinPriceChange={handleFilterChange(setMinPriceVnd)}
                onMaxPriceChange={handleFilterChange(setMaxPriceVnd)}
                onMinRatingChange={handleFilterChange(setMinRating)}
                onInStockChange={handleFilterChange(setInStock)}
                onOnSaleChange={handleFilterChange(setOnSale)}
                onFreeShippingChange={handleFilterChange(setFreeShipping)}
                onReset={handleResetFilters}
              />
              <div className="flex items-center gap-2">
                {isFetching && (
                  <div className="flex items-center gap-2 text-xs font-medium text-indigo-600">
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                    Đang tải...
                  </div>
                )}
                {!isFetching && items.length > 0 && (
                  <span className="text-xs text-muted">{items.length} sản phẩm</span>
                )}
              </div>
            </div>

            {items.length === 0 && !isFetching ? (
              <div className="flex flex-col h-60 items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 text-center gap-3">
                <span className="text-4xl">🔍</span>
                <div>
                  <p className="font-semibold text-stone-600">Không tìm thấy sản phẩm</p>
                  <p className="mt-1 text-sm text-muted">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {items.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {nextCursor && (
              <div className="mt-10 flex justify-center">
                <button
                  onClick={() => setCursor(nextCursor)}
                  disabled={isFetching}
                  className="btn-primary px-8 py-3"
                >
                  {isFetching ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Đang tải...
                    </span>
                  ) : 'Xem thêm sản phẩm'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
