'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatVND } from '@lishop/shared';
import type { ProductSummary } from '../lib/catalog-api';
import { getWishlist, addToWishlist, removeFromWishlist, isLoggedIn } from '../lib/wishlist-api';

function Stars({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            className={`h-3 w-3 ${i <= Math.round(rating) ? 'text-amber-400' : 'text-stone-200'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-xs text-muted">({count})</span>
    </div>
  );
}

export function ProductCard({ product }: { product: ProductSummary }) {
  const queryClient = useQueryClient();
  const [imageFailed, setImageFailed] = useState(false);
  const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0];
  const availableImage = primaryImage && !imageFailed ? primaryImage : null;

  const { data: wishlistIds = [] } = useQuery({
    queryKey: ['wishlist'],
    queryFn: getWishlist,
    enabled: isLoggedIn(),
  });
  const isWishlisted = new Set(wishlistIds).has(product.id);

  const toggleMutation = useMutation({
    mutationFn: () =>
      isWishlisted ? removeFromWishlist(product.id) : addToWishlist(product.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  function handleHeartClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn()) {
      window.location.href = 'http://localhost:3001/login';
      return;
    }
    toggleMutation.mutate();
  }

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="card overflow-hidden h-full flex flex-col">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-50">
          {availableImage ? (
            <Image
              src={availableImage.url}
              alt={availableImage.alt ?? product.name}
              fill
              className="object-cover transition-all duration-350 group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-faint text-sm">
              Chưa có ảnh
            </div>
          )}

          {/* Category badge */}
          <div className="absolute top-2.5 left-2.5">
            <span className="rounded-lg bg-white/95 backdrop-blur-sm px-2 py-0.5 text-xs font-semibold text-indigo-600 shadow-sm">
              {product.category.name}
            </span>
          </div>

          {/* Heart button */}
          <button
            onClick={handleHeartClick}
            disabled={toggleMutation.isPending}
            className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-transform hover:scale-110 disabled:opacity-60"
            aria-label={isWishlisted ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
          >
            <span className={`text-sm leading-none ${isWishlisted ? 'text-red-500' : 'text-gray-400'}`}>
              {isWishlisted ? '♥' : '♡'}
            </span>
          </button>

          {product.stock === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-900/50 backdrop-blur-[1px]">
              <span className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-stone-700">
                Hết hàng
              </span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-indigo-900/80 to-transparent px-3 py-3 transition-transform duration-200 group-hover:translate-y-0">
            <p className="text-center text-xs font-medium text-white/90">Xem chi tiết →</p>
          </div>
        </div>

        <div className="flex flex-col flex-1 p-3.5 gap-1.5">
          <h3 className="line-clamp-2 text-sm font-semibold text-stone-800 group-hover:text-indigo-700 transition-colors leading-snug">
            {product.name}
          </h3>
          {product.averageRating > 0 && (
            <Stars rating={product.averageRating} count={product.reviewCount} />
          )}
          <p className="mt-auto text-base font-black text-indigo-600">
            {formatVND(product.priceVnd)}
          </p>
        </div>
      </div>
    </Link>
  );
}
