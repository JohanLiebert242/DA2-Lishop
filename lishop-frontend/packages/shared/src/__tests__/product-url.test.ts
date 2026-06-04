import { describe, expect, it } from 'vitest';
import { getProductListFiltersFromSearchParams } from '../catalog/product-url';

describe('getProductListFiltersFromSearchParams', () => {
  it('reads category and filters from a product list URL', () => {
    const params = new URLSearchParams({
      categoryId: '4c9e3b7a-2b0d-4c18-85e2-0e6f74240b9c',
      q: 'áo sơ mi',
      brand: 'Lacoste',
      sort: 'price_asc',
    });

    expect(getProductListFiltersFromSearchParams(params)).toEqual({
      categoryId: '4c9e3b7a-2b0d-4c18-85e2-0e6f74240b9c',
      q: 'áo sơ mi',
      brand: 'Lacoste',
      sort: 'price_asc',
    });
  });

  it('ignores unknown sort values and empty filters', () => {
    const params = new URLSearchParams({
      categoryId: '',
      q: '   ',
      sort: 'popular',
    });

    expect(getProductListFiltersFromSearchParams(params)).toEqual({});
  });
});
