import Link from 'next/link';
import { catalogApi } from '../../../lib/catalog-api';
import { ProductCard } from '../../../components/product-card';

interface Props {
  params: Promise<{ slug: string }>;
}

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

function getShopInfo(slug: string) {
  if (slug === 'lishop-official-store') {
    return { name: 'Cửa hàng chính hãng Lishop', brand: undefined };
  }

  const brand = BRAND_BY_SLUG[slug] ?? slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  return { name: `Cửa hàng ${brand}`, brand };
}

export default async function ShopPage({ params }: Props) {
  const { slug } = await params;
  const shop = getShopInfo(slug);
  const products = await catalogApi.getProducts({
    ...(shop.brand && { brand: shop.brand }),
    limit: 100,
    sort: 'newest',
  }).catch(() => ({ items: [], nextCursor: null }));

  return (
    <main className="min-h-screen bg-warm">
      <section className="border-b border-warm bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Link href="/products" className="text-sm font-bold text-indigo-600 transition hover:text-indigo-700">
            Quay lại sản phẩm
          </Link>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-muted">Cửa hàng</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-stone-900">{shop.name}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                Các sản phẩm đang bán tại cửa hàng này được cập nhật từ danh mục hiện có.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-warm-100 px-3 py-2">
                <p className="text-sm font-black text-stone-900">98%</p>
                <p className="text-xs text-muted">Phản hồi</p>
              </div>
              <div className="rounded-lg bg-warm-100 px-3 py-2">
                <p className="text-sm font-black text-stone-900">24h</p>
                <p className="text-xs text-muted">Xử lý</p>
              </div>
              <div className="rounded-lg bg-warm-100 px-3 py-2">
                <p className="text-sm font-black text-stone-900">{products.items.length}</p>
                <p className="text-xs text-muted">Sản phẩm</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        {products.items.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-stone-200 bg-white px-4 py-12 text-center">
            <p className="font-semibold text-stone-700">Cửa hàng chưa có sản phẩm phù hợp.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.items.map((product) => (
              <div key={product.id} data-testid="shop-product-card">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
