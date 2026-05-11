'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { formatVND } from '@lishop/shared';
import { adminApi } from '../../lib/admin-api';

const AUTH_URL  = process.env['NEXT_PUBLIC_MFE_AUTH_URL']  ?? 'http://localhost:3001';
const SHELL_URL = process.env['NEXT_PUBLIC_SHELL_URL']      ?? 'http://localhost:3010';

const NAV_ITEMS = [
  { href: '/admin/orders',     label: 'Đơn hàng' },
  { href: '/admin/users',      label: 'Người dùng' },
  { href: '/admin/products',   label: 'Sản phẩm' },
  { href: '/admin/promotions', label: 'Khuyến mãi' },
  { href: '/admin/analytics',  label: 'Phân tích' },
  { href: '/admin/inventory',  label: 'Kho hàng' },
  { href: '/admin/returns',    label: 'Đổi trả' },
  { href: '/admin/tickets',    label: 'Hỗ trợ' },
  { href: '/admin/faq',        label: 'FAQ' },
  { href: '/admin/reviews',    label: 'Đánh giá' },
  { href: '/admin/flashsales', label: 'Flash Sale' },
  { href: '/admin/payments',   label: 'Thanh toán' },
  { href: '/admin/refunds',    label: 'Hoàn tiền' },
  { href: '/admin/invoices',   label: 'Hóa đơn' },
  { href: '/admin/wallets',    label: 'Ví người dùng' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)lishop_at=([^;]*)/);
    if (!match) { window.location.replace(`${AUTH_URL}/login`); return; }
    try {
      const payload = JSON.parse(atob(match[1]!.split('.')[1]!));
      if (payload.role !== 'ADMIN') window.location.replace(SHELL_URL);
    } catch { window.location.replace(SHELL_URL); }
  }, []);

  const pathname = usePathname();

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-lg font-bold text-indigo-600">
              Lishop Admin
            </Link>
            {stats && (
              <div className="hidden items-center gap-4 text-xs text-gray-500 sm:flex">
                <span>{stats.orderCount} đơn</span>
                <span>{formatVND(stats.revenueVnd)} doanh thu</span>
                <span>{stats.userCount} KH</span>
                <span>{stats.productCount} SP</span>
              </div>
            )}
          </div>
          <a
            href={SHELL_URL}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            ← Trang chủ
          </a>
        </div>
      </header>

      <div className="mx-auto flex max-w-screen-2xl gap-0">
        {/* Sidebar */}
        <nav className="sticky top-[53px] h-[calc(100vh-53px)] w-44 shrink-0 overflow-y-auto border-r border-gray-200 bg-white py-4">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
