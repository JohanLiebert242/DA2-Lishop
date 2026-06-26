'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { hasSessionCookie } from '@lishop/shared';

const SHELL = process.env['NEXT_PUBLIC_SHELL_URL'] ?? 'http://localhost:3010';
const CART_URL = process.env['NEXT_PUBLIC_MFE_CART_URL'] ?? 'http://localhost:3003';
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

function useCartCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // One-time cleanup: remove old-format keys from previous versions
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('lishop_saved_coupons_') || key?.startsWith('lishop_store_chat_')) {
          toRemove.push(key);
        }
      }
      toRemove.forEach((key) => localStorage.removeItem(key));
    } catch { /* ignore */ }

    // Fast path: read from localStorage
    const read = () => {
      const v = parseInt(localStorage.getItem('lishop_cart_count') ?? '0', 10);
      setCount(isNaN(v) ? 0 : v);
    };
    read();
    window.addEventListener('storage', read);

    // Verify real count from server (cross-MFE safe, no event-bus dependency)
    if (hasSessionCookie()) {
      fetch(`${API_URL}/cart`, { credentials: 'include' })
        .then((res) => res.ok ? res.json() : null)
        .then((json) => {
          const cart = json?.data ?? json;
          if (cart?.items) {
            const totalQty = cart.items.reduce((s: number, i: { quantity: number }) => s + (i.quantity ?? 1), 0);
            localStorage.setItem('lishop_cart_count', String(totalQty));
            setCount(totalQty);
          }
        })
        .catch(() => { /* ignore network errors — keep localStorage value */ });
    }

    return () => window.removeEventListener('storage', read);
  }, []);

  return count;
}

export function MiniHeader({ title }: { title?: string }) {
  const cartCount = useCartCount();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-warm bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        {/* Logo */}
        <Link href={SHELL} className="flex items-center gap-2 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-white shadow-brand">
            <img src="/lishop-logo.png" alt="Lishop logo" className="h-full w-full object-contain p-1" />
          </div>
          <span className="text-base font-black text-stone-900 hidden sm:block">Lishop</span>
        </Link>

        {/* Breadcrumb */}
        {title && (
          <div className="flex items-center gap-2 text-sm">
            <Link href={SHELL} className="text-muted hover:text-indigo-600 transition-colors">Trang chủ</Link>
            <span className="text-stone-300">/</span>
            <span className="font-semibold text-stone-800">{title}</span>
          </div>
        )}

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Link
            href={SHELL}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors hidden sm:block"
          >
            ← Trang chủ
          </Link>

          {/* Cart icon — fly target */}
          <a
            href={`${CART_URL}/cart`}
            data-cart-fly-target
            className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-stone-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
            aria-label="Giỏ hàng"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white leading-none">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </a>
        </div>
      </div>
    </header>
  );
}
