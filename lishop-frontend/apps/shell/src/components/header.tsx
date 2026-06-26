'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { formatVND, hasSessionCookie } from '@lishop/shared';
import { eventBus, LishopEvent } from '@lishop/event-bus';
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
  seller: process.env['NEXT_PUBLIC_MFE_SELLER_URL'] ?? 'http://localhost:3011',
} as const;

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface WalletInfo {
  balanceVnd: number;
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

    const channel = new BroadcastChannel('lishop-events');
    channel.onmessage = ({ data }: MessageEvent<{ event?: string; payload?: { itemCount: number } }>) => {
      if (data?.event === 'CART_UPDATED' && data.payload != null) {
        setCount(data.payload.itemCount);
      }
    };

    // One-time cleanup: remove old-format keys from previous versions
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key?.startsWith('lishop_saved_coupons_') || key?.startsWith('lishop_store_chat_')) {
          toRemove.push(key);
        }
      }
      toRemove.forEach((key) => window.localStorage.removeItem(key));
    } catch { /* ignore */ }

    // Verify real cart count from server on mount
    if (hasSessionCookie()) {
      fetch(`${API_URL}/cart`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          const cart = json?.data ?? json;
          if (cart?.items) {
            const totalQty = cart.items.reduce((s: number, i: { quantity: number }) => s + (i.quantity ?? 1), 0);
            window.localStorage.setItem('lishop_cart_count', String(totalQty));
            setCount(totalQty);
          }
        })
        .catch(() => {});
    }

    // Clear stale cart count on login/logout via StorageEvent (cross-MFE compatible)
    const clearStaleCount = () => {
      window.localStorage.removeItem('lishop_cart_count');
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'lishop_cart_count',
        newValue: null,
      }));
      setCount(0);
    };
    eventBus.on(LishopEvent.AUTH_LOGIN, clearStaleCount);
    eventBus.on(LishopEvent.AUTH_LOGOUT, clearStaleCount);

    return () => {
      window.removeEventListener('storage', read);
      channel.close();
      eventBus.off(LishopEvent.AUTH_LOGIN, clearStaleCount);
      eventBus.off(LishopEvent.AUTH_LOGOUT, clearStaleCount);
    };
  }, []);

  return count;
}

function useNotificationCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const read = () => {
      const raw = window.localStorage.getItem('lishop_notification_count');
      setCount(raw ? parseInt(raw, 10) : 0);
    };

    read();
    window.addEventListener('storage', read);
    const handleCountUpdated = ({ count: nextCount }: { count: number }) => setCount(nextCount);
    eventBus.on(LishopEvent.NOTIFICATION_COUNT_UPDATED, handleCountUpdated);

    return () => {
      window.removeEventListener('storage', read);
      eventBus.off(LishopEvent.NOTIFICATION_COUNT_UPDATED, handleCountUpdated);
    };
  }, []);

  return count;
}

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const cartCount = useCartCount();
  const notificationCount = useNotificationCount();
  const [query, setQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const queryClient = useQueryClient();

  const notifPreviewEnabled = isAuthenticated && showNotifications;
  const { data: notificationPreview = [] } = useQuery({
    queryKey: ['shell-notification-preview'],
    enabled: notifPreviewEnabled,
    staleTime: 10_000,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/notifications?page=1&limit=5`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Khong tai duoc thong bao');
      return (json.data ?? json) as Array<{ id: string; title: string; body: string; isRead: boolean }>;
    },
  });

  const { data: wallet } = useQuery({
    queryKey: ['shell-wallet'],
    enabled: isAuthenticated && !isAdmin,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/wallet`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Khong tai duoc so du tai khoan');
      return (json.data ?? json) as WalletInfo;
    },
  });

  const accountItems = useMemo(() => {
    if (isAdmin) {
      return [{ label: 'Quản trị', href: `${MFE.admin}/admin`, className: 'text-indigo-700 hover:bg-indigo-50 font-black' }];
    }

    return [
      { label: 'Trang cá nhân', href: `${MFE.profile}/profile`, className: 'text-stone-700 hover:bg-stone-50 font-bold' },
      { label: 'Đơn hàng của tôi', href: `${MFE.orders}/orders`, className: 'text-stone-700 hover:bg-stone-50 font-bold' },
      { label: 'Yêu thích', href: `${MFE.profile}/wishlist`, className: 'text-stone-700 hover:bg-stone-50 font-bold' },
      { label: 'Bán hàng', href: `${MFE.auth}/become-seller`, className: 'text-emerald-700 hover:bg-emerald-50 font-black' },
      { label: 'Thông báo', href: `${MFE.notifications}/notifications`, className: 'text-stone-700 hover:bg-stone-50 font-bold' },
      { label: 'Ưu đãi & coupon', href: `${MFE.promotions}/promotions`, className: 'text-stone-700 hover:bg-stone-50 font-bold' },
    ];
  }, [isAdmin]);

  const markAllReadOptimistic = () => {
    window.localStorage.setItem('lishop_notification_count', '0');
    eventBus.emit(LishopEvent.NOTIFICATION_COUNT_UPDATED, { count: 0 });
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'lishop_notification_count',
        newValue: '0',
      }),
    );
  };

  const markAllReadServer = async () => {
    try {
      await fetch(`${API_URL}/notifications/read-all`, { method: 'PATCH', credentials: 'include' });
    } finally {
      queryClient.invalidateQueries({ queryKey: ['shell-notification-preview'] });
    }
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const keyword = query.trim();
    if (!keyword) return;
    window.location.href = `${MFE.catalog}/products?q=${encodeURIComponent(keyword)}`;
  };

  const accountInitial = user?.firstName?.charAt(0).toUpperCase() ?? 'U';
  const accountAvatar = user?.avatarUrl?.trim() || null;
  const homeHref = isAdmin ? `${MFE.admin}/admin` : '/';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200/80 bg-white/95 shadow-[0_10px_35px_rgba(28,25,23,0.06)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-16 items-center gap-3 py-3 lg:gap-5">
          <Link href={homeHref} className="flex shrink-0 items-center gap-3" aria-label="Lishop home">
            <div className="relative h-11 w-11 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg shadow-stone-300/70">
              <Image src="/lishop-logo.png" alt="Lishop logo" fill className="object-contain p-1.5" sizes="44px" priority />
            </div>
            <div className="hidden leading-tight sm:block">
              <span className="block text-lg font-black tracking-tight text-stone-950">Lishop</span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-600">
                {isAdmin ? 'Admin workspace' : 'Thương mại thông minh'}
              </span>
            </div>
          </Link>

          {!isAdmin && (
            <>
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
                  <button type="submit" className="rounded-xl bg-stone-950 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-600">
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
              </nav>
            </>
          )}

          {isAdmin && (
            <div className="hidden min-w-0 flex-1 items-center justify-end md:flex">
              <Link
                href={`${MFE.admin}/admin`}
                className="inline-flex items-center rounded-2xl bg-stone-950 px-4 py-2 text-sm font-black text-white transition hover:bg-indigo-700"
              >
                Bảng quản trị
              </Link>
            </div>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const next = !showNotifications;
                    setShowNotifications(next);
                    setShowAccount(false);
                    if (next && isAuthenticated) {
                      markAllReadOptimistic();
                      void markAllReadServer();
                    }
                  }}
                  className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                  aria-label="Thông báo"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notificationCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl shadow-stone-900/12">
                    <div className="border-b border-stone-100 bg-stone-950 px-4 py-3 text-white">
                      <p className="text-sm font-black">Thông báo</p>
                      <p className="mt-0.5 text-xs text-stone-300">Cập nhật đơn hàng, khuyến mãi và hệ thống.</p>
                    </div>
                    <div className="divide-y divide-stone-100">
                      {notificationPreview.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-stone-600">Chưa có thông báo mới.</div>
                      ) : (
                        notificationPreview.map((item) => (
                          <Link
                            key={item.id}
                            href={`${MFE.notifications}/notifications`}
                            className="block px-4 py-3 transition hover:bg-stone-50"
                            onClick={() => setShowNotifications(false)}
                          >
                            <p className={`text-sm font-black ${item.isRead ? 'text-stone-700' : 'text-stone-950'}`}>{item.title}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-stone-500">{item.body}</p>
                          </Link>
                        ))
                      )}
                    </div>
                    <div className="border-t border-stone-100 p-2">
                      <Link
                        href={`${MFE.notifications}/notifications`}
                        className="block rounded-xl px-3 py-2.5 text-center text-xs font-black text-stone-700 transition hover:bg-stone-50"
                        onClick={() => setShowNotifications(false)}
                      >
                        Xem tất cả thông báo
                      </Link>
                    </div>
                  </div>
                )}
              </div>

            {isAuthenticated && !isAdmin && (
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
                {!isAdmin && (
                  <Link
                    href={`${MFE.profile}/wallet`}
                    className="hidden rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 xl:inline-flex"
                  >
                    Số dư: {formatVND(wallet?.balanceVnd ?? 0)}
                  </Link>
                )}

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccount((value) => !value);
                      setShowNotifications(false);
                    }}
                    className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-2 py-1.5 text-sm font-bold text-stone-800 transition hover:border-stone-300 hover:bg-stone-50"
                    aria-label="Tài khoản"
                  >
                    <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-stone-950 text-xs font-black text-white">
                      {accountAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img data-testid="shell-account-avatar" src={accountAvatar} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        accountInitial
                      )}
                    </span>
                    <span className="hidden max-w-28 truncate sm:block">{user?.firstName ?? 'Tài khoản'}</span>
                    <svg className={`h-4 w-4 text-stone-400 transition ${showAccount ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showAccount && (
                    <div data-testid="shell-account-menu" className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl shadow-stone-900/12">
                      <div className="border-b border-stone-100 bg-stone-950 px-4 py-4 text-white">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-amber-400 text-sm font-black text-stone-950">
                            {accountAvatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img data-testid="shell-account-menu-avatar" src={accountAvatar} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                              accountInitial
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black">{user?.firstName ?? 'Tài khoản Lishop'}</p>
                            <p className="mt-0.5 text-xs font-semibold text-stone-300">{user?.role ?? 'CUSTOMER'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        {accountItems.map((item) => (
                          <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => setShowAccount(false)}
                            className={`block rounded-xl px-3 py-2.5 text-sm transition ${item.className}`}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                      <div className="border-t border-stone-100 p-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAccount(false);
                            void logout();
                          }}
                          className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-black text-rose-600 transition hover:bg-rose-50"
                        >
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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

        {!isAdmin && (
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
        )}
      </div>
    </header>
  );
}
