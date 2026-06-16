import type { ProductSummary } from './catalog-api';

const BRAND_BY_SLUG: Record<string, string> = {
  apple: 'Apple',
  samsung: 'Samsung',
  xiaomi: 'Xiaomi',
  oppo: 'OPPO',
  google: 'Google',
  asus: 'ASUS',
  dell: 'Dell',
  nike: 'Nike',
  'levi-s': "Levi's",
  zara: 'Zara',
  philips: 'Philips',
  kiehl: 'Kiehl',
  'the-ordinary': 'The Ordinary',
  'la-roche-posay': 'La Roche Posay',
};

export interface ShopIdentity {
  name: string;
  slug: string;
  brand?: string;
}

export interface ShopStats {
  productCount: number;
  categoryCount: number;
  variantCount: number;
}

export function slugifyShopName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lishop-official-store';
}

export function getShopIdentityFromBrand(brand?: string): ShopIdentity {
  if (!brand) {
    return {
      name: 'Cửa hàng chính hãng Lishop',
      slug: 'lishop-official-store',
      brand: undefined,
    };
  }

  return {
    name: `Cửa hàng ${brand}`,
    slug: slugifyShopName(brand),
    brand,
  };
}

export function getShopIdentityFromSlug(slug: string): ShopIdentity {
  if (slug === 'lishop-official-store') {
    return getShopIdentityFromBrand(undefined);
  }

  const brand =
    BRAND_BY_SLUG[slug] ??
    slug
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  return getShopIdentityFromBrand(brand);
}

export function buildShopStats(products: ProductSummary[]): ShopStats {
  return {
    productCount: products.length,
    categoryCount: new Set(products.map((product) => product.category.name)).size,
    variantCount: products.reduce((sum, product) => sum + product.variants.length, 0),
  };
}
