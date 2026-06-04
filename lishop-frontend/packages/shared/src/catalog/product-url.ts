const PRODUCT_SORTS = new Set(['price_asc', 'price_desc', 'rating_desc', 'newest']);

export interface ProductListUrlFilters {
  categoryId?: string;
  q?: string;
  brand?: string;
  sort?: 'price_asc' | 'price_desc' | 'rating_desc' | 'newest';
}

function clean(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getProductListFiltersFromSearchParams(params: URLSearchParams): ProductListUrlFilters {
  const sort = clean(params.get('sort'));

  return {
    ...(clean(params.get('categoryId')) && { categoryId: clean(params.get('categoryId')) }),
    ...(clean(params.get('q')) && { q: clean(params.get('q')) }),
    ...(clean(params.get('brand')) && { brand: clean(params.get('brand')) }),
    ...(sort && PRODUCT_SORTS.has(sort) && { sort: sort as ProductListUrlFilters['sort'] }),
  };
}

export function productListUrl(baseUrl: string, filters: ProductListUrlFilters = {}) {
  const qs = new URLSearchParams();
  if (filters.categoryId) qs.set('categoryId', filters.categoryId);
  if (filters.q) qs.set('q', filters.q);
  if (filters.brand) qs.set('brand', filters.brand);
  if (filters.sort) qs.set('sort', filters.sort);
  const query = qs.toString();
  return `${baseUrl}/products${query ? `?${query}` : ''}`;
}
