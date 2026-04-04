import Link from 'next/link';
import Image from 'next/image';
import { formatVND } from '@lishop/shared';
import type { ProductSummary } from '../lib/catalog-api';

interface ProductCardProps {
  product: ProductSummary;
}

export function ProductCard({ product }: ProductCardProps) {
  const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0];

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.alt ?? product.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400 text-sm">
              Chưa có ảnh
            </div>
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-gray-800">
                Hết hàng
              </span>
            </div>
          )}
        </div>

        <div className="p-3">
          <p className="text-xs text-indigo-600">{product.category.name}</p>
          <h3 className="mt-1 line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-indigo-600">
            {product.name}
          </h3>

          {product.averageRating > 0 && (
            <div className="mt-1 flex items-center gap-1">
              <span className="text-xs text-yellow-500">{'★'.repeat(Math.round(product.averageRating))}</span>
              <span className="text-xs text-gray-500">({product.reviewCount})</span>
            </div>
          )}

          <p className="mt-2 text-base font-bold text-indigo-600">
            {formatVND(product.priceVnd)}
          </p>
        </div>
      </div>
    </Link>
  );
}
