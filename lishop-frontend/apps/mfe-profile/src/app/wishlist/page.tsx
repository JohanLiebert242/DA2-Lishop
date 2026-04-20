'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { AccountSidebar } from '../../components/account-sidebar';
import { MiniHeader } from '../../components/mini-header';
import { MiniFooter } from '../../components/mini-footer';
import { formatVND } from '@lishop/shared';
import { getWishlistProducts, removeFromWishlist, type WishlistProduct } from '../../lib/wishlist-api';

const MFE_CATALOG = process.env['NEXT_PUBLIC_MFE_CATALOG_URL'] ?? 'http://localhost:3002';

export default function WishlistPage() {
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['wishlist-products'],
    queryFn: getWishlistProducts,
  });

  const removeMutation = useMutation({
    mutationFn: removeFromWishlist,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist-products'] }),
  });

  return (
    <div className="flex min-h-screen flex-col bg-warm">
      <MiniHeader title="Yêu thích" backHref={`${MFE_CATALOG}/products`} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-8">
        <AccountSidebar activeSection="wishlist" />
        <div className="flex-1">
          <h1 className="mb-6 text-xl font-bold text-gray-900">Sản phẩm yêu thích</h1>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
              <p className="text-4xl">♡</p>
              <p className="mt-3 font-semibold text-gray-700">Danh sách yêu thích trống</p>
              <p className="mt-1 text-sm text-gray-400">
                Thêm sản phẩm vào yêu thích để xem ở đây
              </p>
              <a
                href={`${MFE_CATALOG}/products`}
                className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Khám phá sản phẩm →
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {products.map((product: WishlistProduct) => {
                const img =
                  product.images.find((i) => i.isPrimary) ?? product.images[0];
                return (
                  <div key={product.id} className="card overflow-hidden">
                    <div className="relative aspect-square w-full bg-gray-50">
                      {img ? (
                        <Image
                          src={img.url}
                          alt={img.alt ?? product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-gray-300">
                          Chưa có ảnh
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <a
                        href={`${MFE_CATALOG}/products/${product.slug}`}
                        className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-indigo-600"
                      >
                        {product.name}
                      </a>
                      <p className="mt-1 text-base font-bold text-indigo-600">
                        {formatVND(product.priceVnd)}
                      </p>
                      <button
                        onClick={() => removeMutation.mutate(product.id)}
                        disabled={removeMutation.isPending}
                        className="mt-2 w-full rounded-md border border-red-200 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Xóa khỏi yêu thích
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <MiniFooter />
    </div>
  );
}
