'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { formatVND } from '@lishop/shared';
import { useAuth } from '../hooks/use-auth';

const MFE = {
  auth: process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001',
  catalog: process.env['NEXT_PUBLIC_MFE_CATALOG_URL'] ?? 'http://localhost:3002',
  cart: process.env['NEXT_PUBLIC_MFE_CART_URL'] ?? 'http://localhost:3003',
  orders: process.env['NEXT_PUBLIC_MFE_ORDERS_URL'] ?? 'http://localhost:3005',
  profile: process.env['NEXT_PUBLIC_MFE_PROFILE_URL'] ?? 'http://localhost:3006',
  promotions: process.env['NEXT_PUBLIC_MFE_PROMOTIONS_URL'] ?? 'http://localhost:3007',
  notifications: process.env['NEXT_PUBLIC_MFE_NOTIFICATIONS_URL'] ?? 'http://localhost:3008',
  admin: process.env['NEXT_PUBLIC_MFE_ADMIN_URL'] ?? 'http://localhost:3009',
} as const;

const DAILY_COUPON_VALUES = [5000, 10000, 15000, 20000, 30000, 50000];

function getDailyCouponValue(index: number) {
  const daySeed = Math.floor(Date.now() / 86_400_000);
  return DAILY_COUPON_VALUES[(daySeed + index) % DAILY_COUPON_VALUES.length] ?? DAILY_COUPON_VALUES[0] ?? 5000;
}

function useCartCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const read = () => {
      const raw = window.localStorage.getItem('lishop_cart_count');
      setCount(raw ? parseInt(raw, 10) : 0);
    };

    read();
    window.addEventListener('storage', read);

    const ch = new BroadcastChannel('lishop-events');
    ch.onmessage = ({ data }: MessageEvent<{ event?: string; payload?: { itemCount: number } }>) => {
      if (data?.event === 'CART_UPDATED' && data.payload != null) {
        setCount(data.payload.itemCount);
      }
    };

    return () => {
      window.removeEventListener('storage', read);
      ch.close();
    };
  }, []);

  return count;
}

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const cartCount = useCartCount();
  const [query, setQuery] = useState('');
  const [showCoupons, setShowCoupons] = useState(false);

  const dailyCoupons = useMemo(
    () => [
      {
        title: 'Coupon chào ngày mới',
        value: getDailyCouponValue(0),
        code: 'DAILY-LI',
        desc: 'Dùng cho đơn mỹ phẩm, thời trang và đồ gia dụng hôm nay.',
      },
      {
        title: 'Ưu đãi giờ vàng',
        value: getDailyCouponValue(2),
        code: 'GOLDEN-LI',
        desc: 'Mở trong ngày, số lượng giới hạn cho thành viên Lishop.',
      },
      {
        title: 'Nhắc nhẹ đơn lớn',
        value: getDailyCouponValue(4),
        code: 'PLUS-LI',
        desc: 'Đơn từ 30 triệu sẽ nhận thêm coupon 10% cho lần mua kế.',
      },
    ],
    [],
  );

  const unreadCoupons = dailyCoupons.length;

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const keyword = query.trim();
    if (!keyword) return;
    window.location.href = `${MFE.catalog}/products?q=${encodeURIComponent(keyword)}`;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200/80 bg-white/95 shadow-[0_10px_35px_rgba(28,25,23,0.06)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-16 items-center gap-3 py-3 lg:gap-5">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Lishop home">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-950 text-sm font-black leading-none text-white shadow-lg shadow-stone-300">
              Li
            </div>
            <div className="hidden leading-tight sm:block">
              <span className="block text-lg font-black tracking-tight text-stone-950">Lishop</span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-600">
                Smart commerce
              </span>
            </div>
          </Link>

          <form onSubmit={submitSearch} className="hidden min-w-0 flex-1 md:block">
            <label className="group flex h-11 items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-500 transition focus-within:border-amber-400 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(245,158,11,0.14)]">
              <svg className="h-4 w-4 shrink-0 text-stone-400 group-focus-within:text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-stone-800 outline-none placeholder:text-stone-400"
                placeholder="Tìm sản phẩm, thương hiệu, ưu đãi..."
                type="search"
              />
              <button
                type="submit"
                className="rounded-xl bg-stone-950 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-600"
              >
                Tìm
              </button>
            </label>
          </form>

          <nav className="hidden items-center gap-1 lg:flex">
            <Link href={`${MFE.catalog}/products`} className="rounded-xl px-3 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-100">
              Sản phẩm
            </Link>
            <Link href={`${MFE.promotions}/promotions`} className="rounded-xl px-3 py-2 text-sm font-bold text-stone-700 transition hover:bg-amber-50 hover:text-amber-700">
              Khuyến mãi
            </Link>
            {isAuthenticated && (
              <Link href={`${MFE.orders}/orders`} className="rounded-xl px-3 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-100">
                Đơn hàng
              </Link>
            )}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCoupons((value) => !value)}
                className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                aria-label="Thông báo coupon"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
                  {unreadCoupons}
                </span>
              </button>

              {showCoupons && (
                <div className="absolute right-0 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl shadow-stone-900/12">
                  <div className="border-b border-stone-100 bg-stone-950 px-4 py-3 text-white">
                    <p className="text-sm font-black">Coupon hôm nay</p>
                    <p className="mt-0.5 text-xs text-stone-300">Mỗi ngày có ưu đãi nhỏ từ 5K đến 50K.</p>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {dailyCoupons.map((coupon) => (
                      <Link
                        key={coupon.code}
                        href={`${MFE.promotions}/promotions`}
                        className="block px-4 py-3 transition hover:bg-amber-50"
                        onClick={() => setShowCoupons(false)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-stone-900">{coupon.title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-stone-500">{coupon.desc}</p>
                            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400">
                              {coupon.code}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-xl bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700">
                            -{formatVND(coupon.value)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link
                    href={`${MFE.notifications}/notifications`}
                    className="block border-t border-stone-100 px-4 py-3 text-center text-xs font-black text-stone-700 transition hover:bg-stone-50"
                  >
                    Xem tất cả thông báo
                  </Link>
                </div>
              )}
            </div>

            {isAuthenticated && (
              <Link
                href={`${MFE.cart}/cart`}
                className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                aria-label="Giỏ hàng"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-black text-white">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
            )}

            {isAuthenticated ? (
              <>
                <Link href={`${MFE.profile}/profile`} className="hidden items-center gap-2 rounded-2xl bg-stone-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-stone-800 sm:flex">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-stone-950">
                    {user?.firstName?.[0] ?? 'U'}
                  </span>
                  <span>{user?.firstName ?? 'Tài khoản'}</span>
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link href={`${MFE.admin}/admin`} className="hidden rounded-2xl bg-indigo-50 px-3 py-2 text-sm font-black text-indigo-700 transition hover:bg-indigo-100 xl:inline-flex">
                    Quản trị
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="hidden rounded-2xl border border-stone-200 px-3 py-2 text-sm font-bold text-stone-600 transition hover:bg-stone-100 sm:inline-flex"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href={`${MFE.auth}/login`} className="hidden rounded-2xl px-3 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-100 sm:inline-flex">
                  Đăng nhập
                </Link>
                <Link href={`${MFE.auth}/register`} className="rounded-2xl bg-stone-950 px-3.5 py-2 text-sm font-black text-white transition hover:bg-amber-600">
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={submitSearch} className="pb-3 md:hidden">
          <label className="flex h-11 items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-500 focus-within:border-amber-400 focus-within:bg-white">
            <svg className="h-4 w-4 shrink-0 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-stone-800 outline-none placeholder:text-stone-400"
              placeholder="Tìm sản phẩm..."
              type="search"
            />
          </label>
        </form>
      </div>
    </header>
  );
}
