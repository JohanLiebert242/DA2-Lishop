'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { formatVND, useDebounce } from '@lishop/shared';
import type { ProductListUrlFilters } from '@lishop/shared';
import { catalogApi, AiDiscoveryProduct, AiDiscoveryResponse, CategoryItem, ProductListParams, ProductListResponse } from '../../lib/catalog-api';
import { ProductCard } from '../../components/product-card';
import { CategorySidebar } from '../../components/category-sidebar';
import { ProductFilters } from '../../components/product-filters';
import { PersonalizedRecommendations } from '../../components/personalized-recommendations';
import { ChatWidget } from '../../components/chat-widget';

interface Props {
  initialCategories: CategoryItem[];
  initialProducts: ProductListResponse;
  initialFilters: ProductListUrlFilters;
}

function AiSuggestionCard({ product }: { product: AiDiscoveryProduct }) {
  const image = product.images.find((img) => img.isPrimary) ?? product.images[0];

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex min-w-0 items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 transition hover:border-emerald-300 hover:bg-emerald-50/40"
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url}
          alt={image.alt ?? product.name}
          className="h-14 w-14 shrink-0 rounded-md object-cover bg-stone-100"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-stone-100 text-xs text-stone-400">
          No img
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-stone-900 group-hover:text-emerald-800">
          {product.name}
        </p>
        <p className="mt-0.5 text-xs text-stone-500">
          {product.category.name} · {product.stock > 0 ? `${product.stock} trong kho` : 'Het hang'}
        </p>
        <p className="mt-1 text-sm font-black text-emerald-700">{formatVND(product.priceVnd)}</p>
      </div>
    </Link>
  );
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
  const aiPromptRef = useRef<HTMLTextAreaElement | null>(null);
  const [aiHydrated, setAiHydrated] = useState(false);
  const [aiResult, setAiResult] = useState<AiDiscoveryResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
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

  const handleAiDiscovery = useCallback(async () => {
    // Read from DOM first to avoid hydration/timing race in E2E when clicking quickly after filling.
    const message = (aiPromptRef.current?.value ?? '').trim();
    if (!message || aiLoading) return;

    setAiLoading(true);
    setAiError('');
    try {
      const result = await catalogApi.discoverProducts(message);
      setAiResult(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Khong the tu van luc nay');
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading]);

  useEffect(() => {
    setAiHydrated(true);
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
            <section
              data-testid="ai-product-discovery"
              className="mb-6 rounded-lg border border-emerald-200 bg-white px-4 py-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-900 text-sm font-black text-white">
                      AI
                    </span>
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-wide text-stone-900">
                        Tu van nhanh
                      </h2>
                      <p className="text-xs text-stone-500">
                        Noi nhu cau, ngan sach hoac san pham muon so sanh
                      </p>
                    </div>
                  </div>
                  <textarea
                    ref={aiPromptRef}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        handleAiDiscovery();
                      }
                    }}
                    rows={2}
                    className="mt-3 w-full resize-none rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    placeholder="VD: dien thoai chup anh dep duoi 20 trieu, hoac so sanh iphone 15 voi samsung s24"
                  />
                </div>
                {aiHydrated ? (
                  <button
                    type="button"
                    onClick={handleAiDiscovery}
                    disabled={aiLoading}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-emerald-900 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 lg:mt-11"
                  >
                    {aiLoading ? 'Dang tu van...' : 'Tu van'}
                  </button>
                ) : (
                  <div className="h-10 shrink-0 lg:mt-11" />
                )}
              </div>

              {aiError && (
                <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {aiError}
                </p>
              )}

              {aiResult && (
                <div className="mt-4 border-t border-stone-100 pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold uppercase text-emerald-800">
                      {aiResult.mode === 'compare' ? 'So sanh' : 'Goi y'}
                    </span>
                    {aiResult.fallback && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                        Fallback
                      </span>
                    )}
                  </div>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-700">{aiResult.reply}</p>
                  {aiResult.items.length > 0 && (
                    <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {aiResult.items.map((product) => (
                        <AiSuggestionCard key={product.id} product={product} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            <PersonalizedRecommendations context="products" />

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
      <ChatWidget />
    </div>
  );
}
