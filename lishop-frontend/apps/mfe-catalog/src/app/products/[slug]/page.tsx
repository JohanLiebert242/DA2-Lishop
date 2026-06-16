import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { catalogApi } from '../../../lib/catalog-api';
import { buildShopStats } from '../../../lib/shop-info';
import { ProductDetailClient } from './product-detail-client';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await catalogApi.getProduct(slug).catch(() => null);
  if (!product) return { title: 'Sản phẩm — Lishop' };
  const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0];
  return {
    title: `${product.name} — Lishop`,
    description: product.description?.slice(0, 160) ?? `Mua ${product.name} tại Lishop`,
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 160) ?? '',
      ...(primaryImage && { images: [{ url: primaryImage.url, alt: primaryImage.alt ?? product.name }] }),
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await catalogApi.getProduct(slug).catch(() => null);
  if (!product) notFound();
  const shopProducts = await catalogApi.getProducts({
    ...(product.brand && { brand: product.brand }),
    limit: 100,
    sort: 'newest',
  }).catch(() => ({ items: [], nextCursor: null }));

  return (
    <ProductDetailClient
      slug={slug}
      initialProduct={product}
      initialShopStats={buildShopStats(shopProducts.items)}
    />
  );
}
