'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import { formatVND, productListUrl } from '@lishop/shared';
import { useAuthStore } from '../stores/auth.store';
import { NEWS_ITEMS } from '../lib/news';

const API_URL     = process.env['NEXT_PUBLIC_API_URL']             ?? 'http://localhost:4000';
const CATALOG_URL = process.env['NEXT_PUBLIC_MFE_CATALOG_URL']     ?? 'http://localhost:3002';
const AUTH_URL    = process.env['NEXT_PUBLIC_MFE_AUTH_URL']        ?? 'http://localhost:3001';
const PROMO_URL   = process.env['NEXT_PUBLIC_MFE_PROMOTIONS_URL']  ?? 'http://localhost:3007';
const ORDERS_URL  = process.env['NEXT_PUBLIC_MFE_ORDERS_URL']      ?? 'http://localhost:3005';
const PROFILE_URL = process.env['NEXT_PUBLIC_MFE_PROFILE_URL']     ?? 'http://localhost:3006';

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
  const [imageFailed, setImageFailed] = useState(false);
  const availableImage = img && !imageFailed ? img : null;
  return (
    <Link href={`${CATALOG_URL}/products/${product.slug}`} className="group block">
      <div className="card overflow-hidden h-full flex flex-col">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-50">
          {availableImage ? (
            <Image src={availableImage.url} alt={availableImage.alt ?? product.name} fill
              className="object-cover transition-all duration-300 group-hover:scale-[1.04]"
              sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,25vw"
              onError={() => setImageFailed(true)} />
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

function SaleProductCard({ item }: { item: FlashSaleItem }) {
  const [imageFailed, setImageFailed] = useState(false);
  const salePrice = Math.round(item.product.priceVnd * (1 - item.discountPercent / 100));
  const img = item.product.images[0];
  const availableImage = img && !imageFailed ? img : null;

  return (
    <Link key={item.id} href={`${CATALOG_URL}/products/${item.product.slug}`}
      className="group relative rounded-xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all">
      <div className="absolute top-2 right-2 z-10 rounded-lg bg-red-500 px-1.5 py-0.5 text-xs font-black text-white shadow">
        -{item.discountPercent}%
      </div>
      {availableImage ? (
        <div className="relative aspect-square overflow-hidden bg-white/5">
          <Image src={availableImage.url} alt={item.product.name} fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width:640px) 50vw,20vw"
            onError={() => setImageFailed(true)} />
        </div>
      ) : (
        <div className="flex aspect-square items-center justify-center bg-white/5 text-xs font-semibold text-white/55">
          Chưa có ảnh
        </div>
      )}
      <div className="p-2.5">
        <p className="line-clamp-1 text-xs font-semibold text-white leading-snug">{item.product.name}</p>
        <p className="mt-1 text-xs text-white/50 line-through">{formatVND(item.product.priceVnd)}</p>
        <p className="text-sm font-black text-amber-300">{formatVND(salePrice)}</p>
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
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const diff = Math.max(0, new Date(endAt).getTime() - now);
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
const CUSTOMER_REVIEWS = [
  {
    name: 'Minh Anh',
    role: 'Khách hàng thân thiết',
    quote: 'Mình thích nhất là vào một nơi có đủ sản phẩm, coupon và theo dõi đơn. Giao diện mới nhìn sáng và dễ mua hơn.',
    rating: '5.0',
  },
  {
    name: 'Quốc Bảo',
    role: 'Chủ cửa hàng trực tuyến',
    quote: 'Tìm sản phẩm nhanh, giá rõ, đợt bán nhanh dễ theo dõi. Các coupon nhỏ mỗi ngày tạo cảm giác quay lại rất tự nhiên.',
    rating: '4.9',
  },
  {
    name: 'Hoàng Yến',
    role: 'Người mua gia đình',
    quote: 'Mua đơn lớn mà có coupon 10% cho lần sau là điểm cộng lớn. Lishop đang giống một trung tâm mua sắm thật sự.',
    rating: '5.0',
  },
];

export default function HomePage() {
  const { user } = useAuthStore();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterMessage, setNewsletterMessage] = useState('');

  const handleNewsletterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = newsletterEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewsletterMessage('Vui lòng nhập email hợp lệ.');
      return;
    }
    setNewsletterMessage('Đã đăng ký nhận tin Lishop. Ưu đãi mới sẽ được gửi đến email của bạn.');
    setNewsletterEmail('');
  };

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
      <section className="relative overflow-hidden bg-stone-950 text-white">
        <Image
          src="https://picsum.photos/seed/lishop-shell-commerce-hero/1800/980"
          alt="Không gian mua sắm Lishop"
          fill
          priority
          className="object-cover opacity-42"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,10,9,0.96)_0%,rgba(12,10,9,0.78)_42%,rgba(12,10,9,0.32)_100%)]" />
        <div className="relative mx-auto grid min-h-[620px] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-amber-200 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Coupon mới mỗi ngày
            </div>
            <h1 className="text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">
              Lishop gom cả hành trình mua sắm vào một nơi.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/76 sm:text-lg">
              Tìm sản phẩm nhanh, nhận coupon đúng lúc, theo dõi đơn hàng và săn đợt bán nhanh trong cùng một hệ sinh thái micro-frontend.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={`${CATALOG_URL}/products`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-7 py-3.5 text-sm font-black text-stone-950 shadow-xl shadow-amber-950/30 transition hover:bg-amber-300">
                Khám phá sản phẩm
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              {user ? (
                <Link href={`${ORDERS_URL}/orders`}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/18">
                  Đơn hàng của tôi
                </Link>
              ) : (
                <Link href={`${AUTH_URL}/register`}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/18">
                  Đăng ký miễn phí
                </Link>
              )}
            </div>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { value: '500+', label: 'Sản phẩm' },
                { value: '12K+', label: 'Khách hàng' },
                { value: '4.9★', label: 'Đánh giá' },
                { value: '1-3', label: 'Ngày giao' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl border border-white/12 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  <p className="mt-1 text-xs font-semibold text-white/62">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="relative ml-auto max-w-md rounded-[2rem] border border-white/18 bg-white/12 p-4 shadow-2xl shadow-black/30 backdrop-blur-md">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-stone-900">
                <Image
                  src="https://picsum.photos/seed/lishop-hero-product-wall/900/1125"
                  alt="Sản phẩm nổi bật Lishop"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 0vw, 420px"
                />
              </div>
              <div className="absolute -left-8 top-10 rounded-2xl bg-white px-4 py-3 text-stone-950 shadow-xl">
                <p className="text-xs font-bold text-stone-500">Coupon hôm nay</p>
                <p className="text-lg font-black">5K - 50K</p>
              </div>
              <div className="absolute -right-8 bottom-10 rounded-2xl bg-emerald-500 px-4 py-3 text-white shadow-xl">
                <p className="text-xs font-bold text-emerald-100">Đơn lớn</p>
                <p className="text-lg font-black">+10% lần sau</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="hidden">
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
            {user ? (
              <Link href={`${ORDERS_URL}/orders`}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/30 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/25 transition-all">
                Đơn hàng của tôi
              </Link>
            ) : (
              <Link href={`${AUTH_URL}/register`}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/30 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/25 transition-all">
                Đăng ký miễn phí
              </Link>
            )}
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

      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="shrink-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Brand partners</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-stone-950">Thương hiệu nổi bật tại Lishop</h2>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {BRANDS.slice(0, 12).map((brand) => (
                <Link
                  key={brand.name}
                  href={`${CATALOG_URL}/products`}
                  className="group flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2.5 transition hover:border-amber-300 hover:bg-amber-50"
                >
                  <span className="text-xl">{brand.icon}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-stone-900 group-hover:text-amber-700">{brand.name}</p>
                    <p className="truncate text-[11px] font-semibold text-stone-500">{brand.cat}</p>
                  </div>
                </Link>
              ))}
            </div>
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
                      Bán nhanh
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
                  {activeSale.items.slice(0, 5).map(item => (
                    <SaleProductCard key={item.id} item={item} />
                  ))}
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
              <Link key={cat.id} href={productListUrl(CATALOG_URL, { categoryId: cat.id })}
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
            <Link key={brand.name} href={productListUrl(CATALOG_URL, { brand: brand.name })}
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
          {(user ? [
            { icon:'🎁', title:'Tặng voucher 50K', desc:'Kiểm tra các mã ưu đãi của bạn', bg:'from-indigo-600 to-violet-600', cta:'Xem ngay', href:`${PROMO_URL}/promotions` },
            { icon:'📦', title:'Bán nhanh hằng ngày', desc:'12:00 & 20:00 mỗi ngày', bg:'from-rose-600 to-red-600', cta:'Xem ngay', href:`${PROMO_URL}/promotions` },
            { icon:'⭐', title:'Tích điểm mỗi đơn', desc:'Đổi điểm lấy quà hấp dẫn', bg:'from-amber-500 to-orange-500', cta:'Xem điểm', href:`${PROFILE_URL}/profile` },
          ] : [
            { icon:'🎁', title:'Tặng voucher 50K', desc:'Cho đơn đầu tiên của bạn', bg:'from-indigo-600 to-violet-600', cta:'Nhận ngay', href:`${AUTH_URL}/register` },
            { icon:'📦', title:'Bán nhanh hằng ngày', desc:'12:00 & 20:00 mỗi ngày', bg:'from-rose-600 to-red-600', cta:'Xem ngay', href:`${PROMO_URL}/promotions` },
            { icon:'⭐', title:'Tích điểm mỗi đơn', desc:'Đổi điểm lấy quà hấp dẫn', bg:'from-amber-500 to-orange-500', cta:'Tìm hiểu', href:`${AUTH_URL}/register` },
          ]).map(b => (
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
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Đánh giá khách hàng</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-stone-950">Khách hàng nói gì về Lishop</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            Review được chọn từ nhóm khách hàng mua sắm thường xuyên, ưu tiên trải nghiệm tìm kiếm, coupon và theo dõi đơn hàng.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {CUSTOMER_REVIEWS.map((review) => (
            <article key={review.name} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-950 text-sm font-black text-white">
                    {review.name.split(' ').map((part) => part.charAt(0)).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-black text-stone-900">{review.name}</p>
                    <p className="text-xs font-semibold text-stone-500">{review.role}</p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700">
                  {review.rating}★
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-stone-600">{review.quote}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-stone-950 py-12 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Đăng ký email</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Nhận bảng tin ưu đãi mỗi tuần</h2>
            <p className="mt-3 max-w-lg text-sm leading-7 text-white/65">
              Đăng ký bằng email để nhận coupon mới, bản tin bán nhanh và cập nhật sản phẩm nổi bật.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                value={newsletterEmail}
                onChange={(event) => setNewsletterEmail(event.target.value)}
                type="email"
                className="h-12 min-w-0 flex-1 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white outline-none placeholder:text-white/40 focus:border-amber-300"
                placeholder="you@gmail.com"
              />
              <button type="submit" className="h-12 rounded-2xl bg-amber-400 px-6 text-sm font-black text-stone-950 transition hover:bg-amber-300">
                Đăng ký
              </button>
            </form>
            {newsletterMessage && (
              <p className="mt-3 text-sm font-semibold text-amber-200">{newsletterMessage}</p>
            )}
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Tin mới nhất</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Bảng tin Lishop</h2>
              </div>
              <Link href="/news" className="shrink-0 rounded-2xl border border-white/15 px-4 py-2 text-xs font-black text-white transition hover:bg-white/10">
                Xem bảng tin
              </Link>
            </div>
            <div className="grid gap-3">
              {NEWS_ITEMS.map((item) => (
                <Link key={item.id} href={`/news/${item.id}`} className="group rounded-2xl border border-white/12 bg-white/8 p-4 transition hover:border-amber-300/70 hover:bg-white/12">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-white/45">
                    <span>{item.tag}</span>
                    <span>•</span>
                    <span>{item.date}</span>
                  </div>
                  <p className="mt-2 text-base font-black text-white group-hover:text-amber-200">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/58">{item.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 pt-10">
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
