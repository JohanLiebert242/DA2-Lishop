'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import { Store, MapPin, Phone, Calendar } from 'lucide-react';
import { catalogApi } from '../../../lib/catalog-api';
import { getShopIdentityFromSlug, buildShopStats } from '../../../lib/shop-info';
import Link from 'next/link';

export default function ShopPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const fromProduct = searchParams.get('fromProduct');
  const identity = getShopIdentityFromSlug(slug);

  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ['shop', slug],
    queryFn: () => catalogApi.getShopBySlug(slug),
    enabled: !!slug,
  });

  // Try backend shop products first; fall back to brand-based search if backend shop doesn't exist
  const { data: shopProducts, isLoading: shopProductsLoading, isError: shopProductsError } = useQuery({
    queryKey: ['shop-products', slug],
    queryFn: () => catalogApi.getShopProducts(slug, { limit: 100 }),
    enabled: !!slug,
  });

  const { data: brandProducts, isLoading: brandLoading } = useQuery({
    queryKey: ['shop-brand-products', slug, identity.brand],
    queryFn: () => {
      // When brand resolves to the default platform name, return all featured products
      if (!identity.brand || identity.brand === 'Lishop') {
        return catalogApi.getFeatured(100).then((items) => ({ items, nextCursor: null }));
      }
      return catalogApi.getProducts({ brand: identity.brand, limit: 100 });
    },
    enabled: !!slug && shopProductsError,
  });

  const productsData = shopProducts ?? brandProducts;
  const productsLoading = shopProductsLoading || brandLoading;
  if (shopLoading || productsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Đang tải...</p>
      </div>
    );
  }

  // Fallback to brand-derived identity when the shop doesn't exist in the backend
  const shopName = shop?.name ?? identity.name;
  const shopDescription = shop?.description ?? null;
  const shopPhone = shop?.phone ?? null;
  const shopAddress = shop?.address ?? null;
  const shopCreatedAt = shop?.createdAt ?? new Date().toISOString();
  const stats = productsData?.items ? buildShopStats(productsData.items) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Back to product link (shown when navigated from a product page) */}
      {fromProduct ? (
        <a
          href={`/products/${fromProduct}`}
          data-testid="shop-back-to-product"
          className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700"
        >
          ← Quay lại sản phẩm
        </a>
      ) : null}

      {/* Debug: show slug */}
      <div data-testid="shop-slug" style={{display:'none'}}>{slug}</div>

      {/* Shop Header */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-violet-100">
            <Store className="h-10 w-10 text-violet-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{shopName}</h1>
            {shopDescription ? (
              <p className="mt-1 text-sm text-gray-600">{shopDescription}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              {shopPhone ? (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {shopPhone}
                </span>
              ) : null}
              {shopAddress ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {shopAddress}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Tham gia từ {new Date(shopCreatedAt).toLocaleDateString('vi-VN')}
              </span>
              {stats ? (
                <>
                  <span className="text-gray-400">·</span>
                  <span>Sản phẩm {stats.productCount.toLocaleString('vi-VN')}</span>
                  <span className="text-gray-400">·</span>
                  <span>Danh mục {stats.categoryCount.toLocaleString('vi-VN')}</span>
                  <span className="text-gray-400">·</span>
                  <span>Biến thể {stats.variantCount.toLocaleString('vi-VN')}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Products */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Sản phẩm</h2>
        {productsData?.items && productsData.items.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {productsData.items.map((product) => {
              const image = product.images?.find((img) => img.isPrimary) ?? product.images?.[0];
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  data-testid="shop-product-card"
                  className="group rounded-xl border bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-3 flex aspect-square items-center justify-center rounded-lg bg-gray-100">
                    {image ? (
                      <img
                        src={image.url}
                        alt={image.alt ?? product.name}
                        className="h-full w-full rounded-lg object-cover"
                      />
                    ) : (
                      <Store className="h-8 w-8 text-gray-300" />
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 group-hover:text-violet-700 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {product.priceVnd.toLocaleString('vi-VN')}₫
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    {product.averageRating > 0 ? (
                      <span>★ {product.averageRating.toFixed(1)}</span>
                    ) : null}
                    {product.stock > 0 ? (
                      <span className="text-green-600">Còn hàng</span>
                    ) : (
                      <span className="text-red-500">Hết hàng</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center py-16 text-center">
            <Store className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">Cửa hàng chưa có sản phẩm nào.</p>
          </div>
        )}
      </div>
    </div>
  );
}
