'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BadgeDollarSign,
  BellRing,
  Boxes,
  ClipboardList,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  type LucideIcon,
  Megaphone,
  PackageSearch,
  Receipt,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { formatVND, hasSessionCookie } from '@lishop/shared';
import { adminApi } from '../../lib/admin-api';

const AUTH_URL = process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001';
const SHELL_URL = process.env['NEXT_PUBLIC_SHELL_URL'] ?? 'http://localhost:3010';

type NavItem = { href: string; label: string; icon: LucideIcon; tone: string };
type NavSection = { label: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Tổng quan',
    items: [
      { href: '/admin', label: 'Bảng điều khiển', icon: LayoutDashboard, tone: 'from-indigo-500/20 to-blue-500/8 text-indigo-700' },
      { href: '/admin/analytics', label: 'Phân tích', icon: TrendingUp, tone: 'from-sky-500/20 to-cyan-500/8 text-sky-700' },
      { href: '/admin/orders', label: 'Đơn hàng', icon: ClipboardList, tone: 'from-amber-500/20 to-orange-500/8 text-amber-700' },
    ],
  },
  {
    label: 'Vận hành',
    items: [
      { href: '/admin/products', label: 'Sản phẩm', icon: ShoppingBag, tone: 'from-violet-500/20 to-fuchsia-500/8 text-violet-700' },
      { href: '/admin/inventory', label: 'Kho hàng', icon: Boxes, tone: 'from-emerald-500/20 to-teal-500/8 text-emerald-700' },
      { href: '/admin/promotions', label: 'Khuyến mãi', icon: Megaphone, tone: 'from-pink-500/20 to-rose-500/8 text-pink-700' },
      { href: '/admin/flashsales', label: 'Bán nhanh', icon: BellRing, tone: 'from-rose-500/20 to-orange-500/8 text-rose-700' },
      { href: '/admin/payments', label: 'Thanh toán', icon: CreditCard, tone: 'from-cyan-500/20 to-blue-500/8 text-cyan-700' },
      { href: '/admin/invoices', label: 'Hóa đơn', icon: Receipt, tone: 'from-slate-500/20 to-slate-400/8 text-slate-700' },
      { href: '/admin/refunds', label: 'Hoàn tiền', icon: RefreshCcw, tone: 'from-orange-500/20 to-amber-500/8 text-orange-700' },
    ],
  },
  {
    label: 'Chăm sóc',
    items: [
      { href: '/admin/tickets', label: 'Hỗ trợ', icon: Ticket, tone: 'from-sky-500/20 to-indigo-500/8 text-sky-700' },
      { href: '/admin/faq', label: 'Hỏi đáp', icon: HelpCircle, tone: 'from-indigo-500/20 to-violet-500/8 text-indigo-700' },
      { href: '/admin/reviews', label: 'Đánh giá', icon: Star, tone: 'from-amber-500/20 to-yellow-500/8 text-amber-700' },
      { href: '/admin/returns', label: 'Đổi trả', icon: PackageSearch, tone: 'from-rose-500/20 to-fuchsia-500/8 text-rose-700' },
    ],
  },
  {
    label: 'Người dùng',
    items: [
      { href: '/admin/users', label: 'Người dùng', icon: Users, tone: 'from-sky-500/20 to-cyan-500/8 text-sky-700' },
      { href: '/admin/wallets', label: 'Ví người dùng', icon: Wallet, tone: 'from-emerald-500/20 to-cyan-500/8 text-emerald-700' },
      { href: '/admin/wallet-topups', label: 'Duyệt nạp ví', icon: BadgeDollarSign, tone: 'from-amber-500/20 to-orange-500/8 text-amber-700' },
    ],
  },
];

const FLAT_NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!hasSessionCookie()) {
      window.location.replace(`${AUTH_URL}/login`);
      return;
    }

    fetch(`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'}/auth/me`, {
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('unauthorized');
        const json = await res.json();
        const user = json.data ?? json;
        if (user.role !== 'ADMIN') window.location.replace(SHELL_URL);
      })
      .catch(() => window.location.replace(`${AUTH_URL}/login`));
  }, []);

  const pathname = usePathname();

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
  });

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_18%,#f8fafc_100%)] text-slate-900">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-72 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_32%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_28%)]" />

      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/admin" className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/lishop-logo.png" alt="Biểu trưng Lishop" className="h-9 w-9 object-contain" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-slate-950">Lishop Admin</p>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Trung tâm điều hành tổng quan</p>
              </div>
            </Link>

            {stats ? (
              <div className="hidden items-center gap-2 lg:flex">
                {[
                  { label: 'Đơn', value: `${stats.orderCount}`, tone: 'bg-indigo-50 text-indigo-700' },
                  { label: 'Doanh thu', value: formatVND(stats.revenueVnd), tone: 'bg-emerald-50 text-emerald-700' },
                  { label: 'KH', value: `${stats.userCount}`, tone: 'bg-sky-50 text-sky-700' },
                  { label: 'SP', value: `${stats.productCount}`, tone: 'bg-amber-50 text-amber-700' },
                ].map((item) => (
                  <div key={item.label} className={`rounded-full px-3 py-2 text-xs font-semibold ${item.tone}`}>
                    <span className="mr-2 uppercase tracking-[0.22em] opacity-70">{item.label}</span>
                    <span>{item.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 md:flex">
              <ShieldCheck className="h-4 w-4" />
              Hệ thống ổn định
            </div>
            <a
              href={SHELL_URL}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Trang chủ
            </a>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex max-w-[1600px] gap-6 px-4 py-6">
        <aside className="sticky top-[97px] hidden h-[calc(100vh-121px)] w-72 shrink-0 overflow-y-auto rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-[0_24px_80px_-56px_rgba(15,23,42,0.45)] backdrop-blur xl:block">
          <div className="mb-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Không gian làm việc</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">Bảng điều khiển vận hành</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Theo dõi doanh thu, đơn hàng, tồn kho và các tác vụ chăm sóc khách hàng trong một khung quản trị thống nhất.
            </p>
          </div>

          <nav className="space-y-5">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {section.label}
                </p>
                <div className="mt-2 space-y-1.5">
                  {section.items.map((item) => {
                    const active = item.href === '/admin'
                      ? pathname === '/admin'
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                          active
                            ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950'
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${
                            active ? 'from-white/20 to-white/10 text-white' : item.tone
                          }`}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center gap-2 xl:hidden">
            {FLAT_NAV_ITEMS.map((item) => {
              const active = item.href === '/admin'
                ? pathname === '/admin'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${
                    active ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 shadow-sm hover:text-slate-950'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
