'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';

const MFE = {
  auth: 'http://localhost:3001',
  catalog: 'http://localhost:3002',
  cart: 'http://localhost:3003',
  orders: 'http://localhost:3005',
  profile: 'http://localhost:3006',
  promotions: 'http://localhost:3007',
  notifications: 'http://localhost:3008',
  admin: 'http://localhost:3009',
} as const;

function useCartCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const read = () => {
      const raw = window.localStorage.getItem('lishop_cart_count');
      setCount(raw ? parseInt(raw, 10) : 0);
    };
    read();
    window.addEventListener('storage', read);
    return () => window.removeEventListener('storage', read);
  }, []);
  return count;
}

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const cartCount = useCartCount();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-warm bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-brand">
            <span className="text-base font-black tracking-tight text-white leading-none">Li</span>
          </div>
          <span className="text-lg font-800 text-stone-900 tracking-tight hidden sm:block" style={{ fontWeight: 800 }}>
            Lishop
          </span>
        </Link>

        {/* Search bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <Link
            href={`${MFE.catalog}/products`}
            className="flex items-center gap-2 w-full rounded-xl border-1.5 border-warm bg-warm px-4 py-2 text-sm text-muted hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-150"
            style={{ border: '1.5px solid #f0ede8' }}
          >
            <svg className="h-4 w-4 shrink-0 text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Tìm kiếm sản phẩm...</span>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <Link
            href={`${MFE.catalog}/products`}
            className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
          >
            Sản phẩm
          </Link>
          <Link
            href={`${MFE.promotions}/promotions`}
            className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
          >
            Khuyến mãi
          </Link>

          {isAuthenticated && (
            <>
              <Link
                href={`${MFE.cart}/cart`}
                className="relative rounded-lg p-2 text-stone-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                aria-label="Giỏ hàng"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white leading-none">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
              <Link
                href={`${MFE.orders}/orders`}
                className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                Đơn hàng
              </Link>
              <Link
                href={`${MFE.notifications}/notifications`}
                className="rounded-lg p-2 text-stone-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                aria-label="Thông báo"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </Link>
              {user?.role === 'ADMIN' && (
                <Link
                  href={`${MFE.admin}/admin`}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  Quản trị
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Auth */}
        <div className="flex shrink-0 items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link
                href={`${MFE.profile}/profile`}
                className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <div className="h-6 w-6 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">
                  {user?.firstName?.[0] ?? 'U'}
                </div>
                <span className="hidden sm:block">{user?.firstName}</span>
              </Link>
              <button
                onClick={() => void logout()}
                className="rounded-xl border border-warm px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-warm-100 transition-colors"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link
                href={`${MFE.auth}/login`}
                className="rounded-xl px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-warm-100 transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                href={`${MFE.auth}/register`}
                className="btn-primary text-sm"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
