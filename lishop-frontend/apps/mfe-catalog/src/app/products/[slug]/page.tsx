'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { formatVND } from '@lishop/shared';
import { catalogApi } from '../../../lib/catalog-api';

interface Props {
  params: Promise<{ slug: string }>;
}

export default function ProductDetailPage({ params }: Props) {
  const { slug } = use(params);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => catalogApi.getProduct(slug),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-gray-400">
        Đang tải...
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-red-600">Không tìm thấy sản phẩm.</p>
        <Link href="/products" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  const images = product.images.length > 0
    ? product.images.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
    : null;
  const currentImage = images?.[selectedImageIndex];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-indigo-600">Trang chủ</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-indigo-600">Sản phẩm</Link>
        <span>/</span>
        <Link href={`/products?categoryId=${product.category.id}`} className="hover:text-indigo-600">
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-gray-800">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Images */}
        <div>
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
            {currentImage ? (
              <Image
                src={currentImage.url}
                alt={currentImage.alt ?? product.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                Chưa có ảnh
              </div>
            )}
          </div>
          {images && images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIndex(i)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded border-2 transition-colors ${
                    i === selectedImageIndex ? 'border-indigo-500' : 'border-gray-200'
                  }`}
                >
                  <Image src={img.url} alt={img.alt ?? ''} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-sm text-indigo-600">{product.category.name}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{product.name}</h1>

          {product.averageRating > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex text-yellow-400">
                {'★'.repeat(Math.round(product.averageRating))}
                {'☆'.repeat(5 - Math.round(product.averageRating))}
              </div>
              <span className="text-sm text-gray-500">{product.averageRating.toFixed(1)} ({product.reviewCount} đánh giá)</span>
            </div>
          )}

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-indigo-600">{formatVND(product.priceVnd)}</span>
          </div>

          <div className="mt-2">
            {product.stock > 0 ? (
              <span className="inline-flex items-center gap-1 text-sm text-green-600">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Còn hàng ({product.stock} sản phẩm)
              </span>
            ) : (
              <span className="text-sm text-red-600">Hết hàng</span>
            )}
          </div>

          {product.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.tags.map(({ tag }) => (
                <span key={tag.name} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6">
            <button
              disabled={product.stock === 0}
              className="w-full rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {product.stock > 0 ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
            </button>
          </div>

          <div className="mt-6 border-t pt-6">
            <h2 className="text-sm font-semibold text-gray-900">Mô tả sản phẩm</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 whitespace-pre-line">
              {product.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
