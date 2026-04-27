'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { AccountSidebar } from '../../components/account-sidebar';
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
    <div className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-8">
      <AccountSidebar activeSection="wishlist" />
      <div className="flex-1">
        <h1 className="mb-6 text-xl font-bold text-stone-900">Sản phẩm yêu thích</h1>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl bg-stone-100" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center gap-4">
            <span className="text-5xl">♡</span>
            <div>
              <p className="font-bold text-stone-700">Danh sách yêu thích trống</p>
              <p className="mt-1 text-sm text-muted">Thêm sản phẩm vào yêu thích để xem ở đây</p>
            </div>
            <a
              href={`${MFE_CATALOG}/products`}
              className="btn-primary mt-2"
            >
              Khám phá sản phẩm →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {products.map((product: WishlistProduct) => {
              const img = product.images.find((i) => i.isPrimary) ?? product.images[0];
              return (
                <div key={product.id} className="card overflow-hidden">
                  <a href={`${MFE_CATALOG}/products/${product.slug}`} className="block relative aspect-square w-full bg-stone-50">
                    {img ? (
                      <Image
                        src={img.url}
                        alt={img.alt ?? product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-stone-300">
                        Chưa có ảnh
                      </div>
                    )}
                  </a>
                  <div className="p-3">
                    <a
                      href={`${MFE_CATALOG}/products/${product.slug}`}
                      className="line-clamp-2 text-sm font-semibold text-stone-900 hover:text-indigo-600 transition-colors"
                    >
                      {product.name}
                    </a>
                    <p className="mt-1 text-base font-bold text-indigo-600">
                      {formatVND(product.priceVnd)}
                    </p>
                    <button
                      onClick={() => removeMutation.mutate(product.id)}
                      disabled={removeMutation.isPending}
                      className="mt-2 w-full cursor-pointer rounded-md border border-red-200 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
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
    </div>
  );
}
