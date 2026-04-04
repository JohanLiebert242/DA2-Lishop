'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { formatVND } from '@lishop/shared';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
}

interface FeaturedProduct {
  id: string;
  name: string;
  slug: string;
  priceVnd: number;
  averageRating: number;
  images: ProductImage[];
  category: { name: string };
}

async function getFeaturedProducts(): Promise<FeaturedProduct[]> {
  const res = await fetch(`${API_URL}/products/featured?limit=8`);
  const json = await res.json();
  return (json.data ?? json) as FeaturedProduct[];
}

function FeaturedProductCard({ product }: { product: FeaturedProduct }) {
  const image = product.images.find((i) => i.isPrimary) ?? product.images[0];
  return (
    <Link href={`http://localhost:3002/products/${product.slug}`} className="group block">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        <div className="relative aspect-square w-full bg-gray-100">
          {image ? (
            <Image
              src={image.url}
              alt={image.alt ?? product.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-300 text-xs">No image</div>
          )}
        </div>
        <div className="p-3">
          <p className="text-xs text-indigo-600">{product.category.name}</p>
          <h3 className="mt-1 line-clamp-2 text-sm font-medium text-gray-900">{product.name}</h3>
          <p className="mt-1 text-sm font-bold text-indigo-600">{formatVND(product.priceVnd)}</p>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { data: featured = [] } = useQuery({
    queryKey: ['featured-products'],
    queryFn: getFeaturedProducts,
  });

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-20 text-white text-center">
        <h1 className="text-4xl font-bold">Chào mừng đến Lishop</h1>
        <p className="mt-3 text-lg text-indigo-100">Hàng nghìn sản phẩm chất lượng, giao hàng nhanh chóng</p>
        <Link
          href="http://localhost:3002/products"
          className="mt-6 inline-block rounded-full bg-white px-8 py-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          Mua sắm ngay
        </Link>
      </section>

      {/* Featured Products */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Sản phẩm nổi bật</h2>
            <Link href="http://localhost:3002/products" className="text-sm text-indigo-600 hover:underline">
              Xem tất cả →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((product) => (
              <FeaturedProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
