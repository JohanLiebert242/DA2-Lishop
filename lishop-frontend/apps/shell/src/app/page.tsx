'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { formatVND } from '@lishop/shared';

const API_URL     = process.env['NEXT_PUBLIC_API_URL']         ?? 'http://localhost:4000';
const CATALOG_URL = process.env['NEXT_PUBLIC_MFE_CATALOG_URL'] ?? 'http://localhost:3002';
const AUTH_URL    = process.env['NEXT_PUBLIC_MFE_AUTH_URL']    ?? 'http://localhost:3001';
const PROMO_URL   = process.env['NEXT_PUBLIC_MFE_PROMOTIONS_URL'] ?? 'http://localhost:3007';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProductImage { id: string; url: string; alt: string | null; isPrimary: boolean; }
interface Product {
  id: string; name: string; slug: string; priceVnd: number;
  averageRating: number; reviewCount: number;
  images: ProductImage[];
  category: { name: string };
}
interface FlashSaleItem {
  id: string; discountPercent: number;
  product: { id: string; name: string; slug: string; priceVnd: number; images: { url: string }[] };
}
interface FlashSale { id: string; endAt: string; items: FlashSaleItem[]; }
interface Category { id: string; name: string; slug: string; imageUrl: string | null; parentId: string | null; }

// ─── API fetchers ─────────────────────────────────────────────────────────────
const apiFetch = async <T,>(path: string): Promise<T> => {
  const res  = await fetch(`${API_URL}${path}`);
  const json = await res.json();
  return (json.data ?? json) as T;
};

// ─── Shared sub-components ────────────────────────────────────────────────────
function Stars({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-px">
        {[1,2,3,4,5].map(i => (
          <svg key={i} className={`h-3 w-3 ${i <= Math.round(rating) ? 'text-amber-400' : 'text-stone-200'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
        ))}
      </div>
      <span className="text-xs text-muted">({count})</span>
    </div>
  );
}

function ProductCard({ product, badge }: { product: Product; badge?: React.ReactNode }) {
  const img = product.images.find(i => i.isPrimary) ?? product.images[0];
  return (
    <Link href={`${CATALOG_URL}/products/${product.slug}`} className="group block">
      <div className="card overflow-hidden h-full flex flex-col">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-50">
          {img ? (
            <Image src={img.url} alt={img.alt ?? product.name} fill
              className="object-cover transition-all duration-300 group-hover:scale-[1.04]"
              sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,25vw" />
          ) : (
            <div className="flex h-full items-center justify-center text-faint text-xs">Chưa có ảnh</div>
          )}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <span className="rounded-lg bg-white/95 backdrop-blur-sm px-2 py-0.5 text-xs font-semibold text-indigo-600 shadow-sm">
              {product.category.name}
            </span>
            {badge}
          </div>
          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-indigo-900/80 to-transparent px-3 py-2.5 transition-transform duration-200 group-hover:translate-y-0">
            <p className="text-xs font-medium text-white text-center">Xem chi tiết →</p>
          </div>
        </div>
        <div className="flex flex-col flex-1 p-3.5 gap-1.5">
          <h3 className="line-clamp-2 text-sm font-semibold text-stone-800 group-hover:text-indigo-700 transition-colors leading-snug">
            {product.name}
          </h3>
          {product.averageRating > 0 && <Stars rating={product.averageRating} count={product.reviewCount} />}
          <p className="mt-auto text-base font-black text-indigo-600" style={{ fontWeight: 800 }}>
            {formatVND(product.priceVnd)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function SectionHeader({
  icon, title, subtitle, href, accentColor = 'text-indigo-600',
}: { icon: string; title: string; subtitle: string; href: string; accentColor?: string }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">{title}</h2>
          <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
        </div>
      </div>
      <Link href={href} className={`flex items-center gap-1 text-sm font-bold ${accentColor} hover:opacity-80 transition-opacity shrink-0`}>
        Xem tất cả
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Link>
    </div>
  );
}

function ProductGrid({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}

function SkeletonGrid({ cols = 4 }: { cols?: number }) {
  return (
    <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-${cols}`}>
      {Array.from({ length: cols * 2 }).map((_, i) => (
        <div key={i} className="card overflow-hidden animate-pulse">
          <div className="aspect-[4/3] bg-stone-100" />
          <div className="p-3.5 space-y-2">
            <div className="h-3 bg-stone-100 rounded w-3/4" />
            <div className="h-3 bg-stone-100 rounded w-1/2" />
            <div className="h-4 bg-stone-100 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Countdown ────────────────────────────────────────────────────────────────
function Countdown({ endAt }: { endAt: string }) {
  const diff = Math.max(0, new Date(endAt).getTime() - Date.now());
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="flex items-center gap-1.5">
      {[pad(h), pad(m), pad(s)].map((v, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="flex h-9 w-10 items-center justify-center rounded-lg bg-white/20 text-base font-black text-white tabular-nums backdrop-blur-sm">
            {v}
          </span>
          {i < 2 && <span className="text-base font-black text-white/80">:</span>}
        </span>
      ))}
    </div>
  );
}

// ─── Category card data ───────────────────────────────────────────────────────
const CAT_META: Record<string, { icon: string; gradient: string }> = {
  electronics:  { icon: '📱', gradient: 'from-blue-500 to-indigo-600' },
  fashion:      { icon: '👗', gradient: 'from-pink-500 to-rose-600' },
  'home-living':{ icon: '🏠', gradient: 'from-amber-500 to-orange-600' },
  sports:       { icon: '⚽', gradient: 'from-emerald-500 to-teal-600' },
  books:        { icon: '📚', gradient: 'from-violet-500 to-purple-600' },
};

// ─── Brand data (hardcoded from seed products) ────────────────────────────────
const BRANDS = [
  { name: 'Apple',        icon: '🍎', cat: 'Điện tử' },
  { name: 'Samsung',      icon: '📲', cat: 'Điện tử' },
  { name: 'Xiaomi',       icon: '📡', cat: 'Điện tử' },
  { name: 'Dell',         icon: '💻', cat: 'Laptop' },
  { name: 'ASUS',         icon: '🎮', cat: 'Laptop' },
  { name: 'Nike',         icon: '👟', cat: 'Thể thao' },
  { name: "Levi's",       icon: '👖', cat: 'Thời trang' },
  { name: 'Zara',         icon: '👗', cat: 'Thời trang' },
  { name: 'Philips',      icon: '🍳', cat: 'Nhà bếp' },
  { name: 'Lacoste',      icon: '🐊', cat: 'Thời trang' },
  { name: 'Bowflex',      icon: '💪', cat: 'Thể thao' },
  { name: 'Michael Kors', icon: '👜', cat: 'Thời trang' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { data: featured = [], isLoading: featuredLoading } = useQuery({
    queryKey: ['home-featured'],
    queryFn: () => apiFetch<Product[]>('/products/featured?limit=8'),
  });

  const { data: hotData, isLoading: hotLoading } = useQuery({
    queryKey: ['home-hot'],
    queryFn: () => apiFetch<{ items: Product[] }>('/products?limit=8&sort=rating_desc'),
  });

  const { data: newData, isLoading: newLoading } = useQuery({
    queryKey: ['home-new'],
    queryFn: () => apiFetch<{ items: Product[] }>('/products?limit=8&sort=newest'),
  });

  const { data: budgetData, isLoading: budgetLoading } = useQuery({
    queryKey: ['home-budget'],
    queryFn: () => apiFetch<{ items: Product[] }>('/products?limit=8&sort=price_asc'),
  });

  const { data: flashSales = [] } = useQuery({
    queryKey: ['home-flash-sales'],
    queryFn: () => apiFetch<FlashSale[]>('/promotions/flash-sales/active'),
    refetchInterval: 60_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['home-categories'],
    queryFn: () => apiFetch<Category[]>('/categories'),
  });

  const hotProducts    = hotData?.items    ?? [];
  const newProducts    = newData?.items    ?? [];
  const budgetProducts = budgetData?.items ?? [];
  const activeSale     = flashSales[0];
  const rootCategories = categories.filter(c => !c.parentId);

  return (
    <div className="bg-warm min-h-screen">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg,#4c1d95 0%,#6d28d9 35%,#7c3aed 60%,#a855f7 85%,#c084fc 100%)',
        }} />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle,#f59e0b,transparent)' }} />
        <div className="absolute -bottom-16 -left-16 h-72 w-72 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle,#c084fc,transparent)' }} />
        <div className="absolute top-1/3 right-1/4 h-56 w-56 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle,#fbbf24,transparent)' }} />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold text-white/90 mb-6 border border-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Mua sắm thông minh · Sống tốt hơn
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight leading-[1.05]">
            Chào mừng đến{' '}
            <span className="relative inline-block">
              <span className="relative z-10">Lishop</span>
              <span className="absolute -bottom-1 left-0 right-0 h-3 bg-amber-400/40 rounded-sm" />
            </span>
          </h1>
          <p className="mt-5 text-lg text-white/75 max-w-xl mx-auto leading-relaxed">
            Hàng nghìn sản phẩm chất lượng từ các thương hiệu uy tín, giao hàng siêu tốc 1–3 ngày
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={`${CATALOG_URL}/products`}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-indigo-700 shadow-warm hover:shadow-brand transition-all hover:-translate-y-0.5">
              Khám phá ngay
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link href={`${AUTH_URL}/register`}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/30 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/25 transition-all">
              Đăng ký miễn phí
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-12 flex items-center justify-center gap-8 sm:gap-14">
            {[
              { value: '15+', label: 'Sản phẩm' },
              { value: '4', label: 'Khách hàng' },
              { value: '4.7★', label: 'Đánh giá' },
              { value: '1–3', label: 'Ngày giao' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs text-white/60 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Category pills ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pt-10 pb-4">
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {[
            { label: '🛍️ Tất cả', href: `${CATALOG_URL}/products` },
            { label: '📱 Điện tử',    href: `${CATALOG_URL}/products` },
            { label: '👗 Thời trang', href: `${CATALOG_URL}/products` },
            { label: '🏠 Nhà cửa',   href: `${CATALOG_URL}/products` },
            { label: '⚽ Thể thao',  href: `${CATALOG_URL}/products` },
            { label: '📚 Sách',      href: `${CATALOG_URL}/products` },
          ].map(cat => (
            <Link key={cat.label} href={cat.href}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white border border-warm px-4 py-2.5 text-sm font-semibold text-stone-700 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 transition-all shadow-sm whitespace-nowrap">
              {cat.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured products ──────────────────────────────────────────── */}
      {(featuredLoading || featured.length > 0) && (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <SectionHeader icon="⭐" title="Sản phẩm nổi bật" subtitle="Được chọn lọc kỹ càng cho bạn"
            href={`${CATALOG_URL}/products`} />
          {featuredLoading ? <SkeletonGrid /> : <ProductGrid products={featured} />}
        </section>
      )}

      {/* ── Flash sale banner ─────────────────────────────────────────── */}
      {activeSale && (
        <section className="mx-auto max-w-7xl px-4 py-4">
          <div className="relative overflow-hidden rounded-2xl" style={{
            background: 'linear-gradient(135deg,#dc2626 0%,#9f1239 40%,#7c3aed 100%)',
          }}>
            {/* Dot pattern */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle,white 1px,transparent 1px)',
              backgroundSize: '28px 28px',
            }} />

            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-6">
              <div className="flex items-center gap-4">
                <span className="text-4xl animate-bounce">⚡</span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded-full bg-red-300/30 px-2.5 py-0.5 text-xs font-black text-white tracking-widest uppercase">
                      Flash Sale
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-red-300 animate-ping" />
                  </div>
                  <p className="text-xl font-black text-white">Đang giảm đến <span className="text-amber-300">25%</span></p>
                  <p className="text-xs text-white/70 mt-0.5">{activeSale.items.length} sản phẩm đang sale · Số lượng có hạn</p>
                </div>
              </div>

              <div className="flex flex-col items-center sm:items-end gap-2">
                <p className="text-xs font-semibold text-white/70">Kết thúc sau:</p>
                <Countdown endAt={activeSale.endAt} />
              </div>

              <Link href={`${PROMO_URL}/promotions`}
                className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-red-600 hover:bg-red-50 transition-all hover:-translate-y-0.5 shadow-lg">
                Mua ngay →
              </Link>
            </div>

            {/* Sale product strip */}
            {activeSale.items.length > 0 && (
              <div className="px-6 pb-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {activeSale.items.slice(0, 5).map(item => {
                    const salePrice = Math.round(item.product.priceVnd * (1 - item.discountPercent / 100));
                    const img = item.product.images[0];
                    return (
                      <Link key={item.id} href={`${CATALOG_URL}/products/${item.product.slug}`}
                        className="group relative rounded-xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all">
                        {/* Discount badge */}
                        <div className="absolute top-2 right-2 z-10 rounded-lg bg-red-500 px-1.5 py-0.5 text-xs font-black text-white shadow">
                          -{item.discountPercent}%
                        </div>
                        {img && (
                          <div className="relative aspect-square overflow-hidden bg-white/5">
                            <Image src={img.url} alt={item.product.name} fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              sizes="(max-width:640px) 50vw,20vw" />
                          </div>
                        )}
                        <div className="p-2.5">
                          <p className="line-clamp-1 text-xs font-semibold text-white leading-snug">{item.product.name}</p>
                          <p className="mt-1 text-xs text-white/50 line-through">{formatVND(item.product.priceVnd)}</p>
                          <p className="text-sm font-black text-amber-300">{formatVND(salePrice)}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Hot products ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-end justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-2xl shadow-lg shadow-red-200">
              🔥
            </div>
            <div>
              <h2 className="text-2xl font-black text-stone-900 tracking-tight">Sản phẩm HOT</h2>
              <p className="mt-0.5 text-sm text-muted">Đánh giá cao nhất từ khách hàng</p>
            </div>
          </div>
          <Link href={`${CATALOG_URL}/products`}
            className="flex items-center gap-1 text-sm font-bold text-red-600 hover:text-red-800 transition-colors shrink-0">
            Xem tất cả <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </Link>
        </div>
        {hotLoading ? <SkeletonGrid /> : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {hotProducts.map((p, i) => (
              <ProductCard key={p.id} product={p} badge={
                i < 3 ? (
                  <span className="rounded-lg bg-red-500 px-2 py-0.5 text-xs font-black text-white shadow">
                    #{i + 1} HOT
                  </span>
                ) : undefined
              } />
            ))}
          </div>
        )}
      </section>

      {/* ── New arrivals ──────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-indigo-50/60 to-white py-10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-end justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl shadow-lg shadow-indigo-200">
                ✨
              </div>
              <div>
                <h2 className="text-2xl font-black text-stone-900 tracking-tight">Hàng mới về</h2>
                <p className="mt-0.5 text-sm text-muted">Cập nhật mới nhất từ các thương hiệu</p>
              </div>
            </div>
            <Link href={`${CATALOG_URL}/products`}
              className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors shrink-0">
              Xem tất cả <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
          </div>
          {newLoading ? <SkeletonGrid /> : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {newProducts.map(p => (
                <ProductCard key={p.id} product={p} badge={
                  <span className="rounded-lg bg-indigo-600 px-2 py-0.5 text-xs font-black text-white shadow">MỚI</span>
                } />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Browse by Category ────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">Khám phá theo danh mục</h2>
          <p className="mt-1.5 text-sm text-muted">Tìm sản phẩm theo đúng sở thích của bạn</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {(rootCategories.length > 0 ? rootCategories : [
            { id:'1', name:'Điện tử',     slug:'electronics',  imageUrl:null, parentId:null },
            { id:'2', name:'Thời trang',  slug:'fashion',      imageUrl:null, parentId:null },
            { id:'3', name:'Nhà cửa',     slug:'home-living',  imageUrl:null, parentId:null },
            { id:'4', name:'Thể thao',    slug:'sports',       imageUrl:null, parentId:null },
            { id:'5', name:'Sách',        slug:'books',        imageUrl:null, parentId:null },
          ]).map(cat => {
            const meta = CAT_META[cat.slug] ?? { icon: '📦', gradient: 'from-stone-400 to-stone-600' };
            return (
              <Link key={cat.id} href={`${CATALOG_URL}/products`}
                className="group relative overflow-hidden rounded-2xl aspect-[4/3] flex flex-col items-center justify-center text-white cursor-pointer shadow-warm hover:shadow-brand transition-all hover:-translate-y-1">
                {cat.imageUrl ? (
                  <Image src={cat.imageUrl} alt={cat.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : null}
                <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} ${cat.imageUrl ? 'opacity-60' : 'opacity-100'}`} />
                <div className="relative z-10 flex flex-col items-center gap-2 p-4 text-center">
                  <span className="text-4xl drop-shadow-md">{meta.icon}</span>
                  <span className="text-base font-black leading-tight drop-shadow-sm">{cat.name}</span>
                </div>
                <div className="absolute inset-0 ring-2 ring-white/0 group-hover:ring-white/40 rounded-2xl transition-all" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Budget / Best price ───────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-emerald-50/60 to-white py-10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-end justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl shadow-lg shadow-emerald-200">
                💰
              </div>
              <div>
                <h2 className="text-2xl font-black text-stone-900 tracking-tight">Giá tốt nhất</h2>
                <p className="mt-0.5 text-sm text-muted">Sản phẩm chất lượng, giá siêu ưu đãi</p>
              </div>
            </div>
            <Link href={`${CATALOG_URL}/products`}
              className="flex items-center gap-1 text-sm font-bold text-emerald-600 hover:text-emerald-800 transition-colors shrink-0">
              Xem tất cả <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
          </div>
          {budgetLoading ? <SkeletonGrid /> : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {budgetProducts.map(p => (
                <ProductCard key={p.id} product={p} badge={
                  <span className="rounded-lg bg-emerald-500 px-2 py-0.5 text-xs font-black text-white shadow">GIÁ TỐT</span>
                } />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Brands ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">Thương hiệu nổi bật</h2>
          <p className="mt-1.5 text-sm text-muted">Hàng chính hãng, chất lượng được kiểm chứng</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {BRANDS.map(brand => (
            <Link key={brand.name} href={`${CATALOG_URL}/products`}
              className="group flex items-center gap-2.5 rounded-2xl bg-white border border-warm px-5 py-3 shadow-sm hover:shadow-brand hover:border-indigo-200 transition-all hover:-translate-y-0.5">
              <span className="text-2xl">{brand.icon}</span>
              <div className="text-left">
                <p className="text-sm font-black text-stone-800 group-hover:text-indigo-700 transition-colors">{brand.name}</p>
                <p className="text-xs text-muted">{brand.cat}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Promo banner ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon:'🎁', title:'Tặng voucher 50K', desc:'Cho đơn đầu tiên của bạn', bg:'from-indigo-600 to-violet-600', cta:'Nhận ngay', href:`${AUTH_URL}/register` },
            { icon:'📦', title:'Flash sale hàng ngày', desc:'12:00 & 20:00 mỗi ngày', bg:'from-rose-600 to-red-600', cta:'Xem ngay', href:`${PROMO_URL}/promotions` },
            { icon:'⭐', title:'Tích điểm mỗi đơn', desc:'Đổi điểm lấy quà hấp dẫn', bg:'from-amber-500 to-orange-500', cta:'Tìm hiểu', href:`${AUTH_URL}/register` },
          ].map(b => (
            <Link key={b.title} href={b.href}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${b.bg} p-5 text-white hover:-translate-y-1 transition-all shadow-warm hover:shadow-brand`}>
              <div className="absolute -right-4 -bottom-4 text-7xl opacity-20 group-hover:opacity-30 transition-opacity">{b.icon}</div>
              <span className="text-3xl mb-3 block">{b.icon}</span>
              <p className="font-black text-lg leading-tight">{b.title}</p>
              <p className="mt-1 text-sm text-white/75">{b.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 rounded-lg bg-white/20 backdrop-blur-sm px-3 py-1.5 text-xs font-bold hover:bg-white/30 transition-colors">
                {b.cta} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Trust strip ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="rounded-2xl bg-white border border-warm p-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { icon:'🚚', title:'Giao hàng 1–3 ngày', desc:'Toàn quốc, nhanh chóng' },
              { icon:'🔒', title:'Thanh toán an toàn', desc:'Mã hóa SSL 256-bit' },
              { icon:'↩️', title:'Đổi trả 30 ngày',   desc:'Hoàn tiền không hỏi' },
              { icon:'🎁', title:'Tích điểm thưởng',  desc:'1% giá trị mỗi đơn' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{item.icon}</span>
                <div>
                  <p className="text-sm font-bold text-stone-800">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
