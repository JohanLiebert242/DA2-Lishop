'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  type LucideIcon,
  Megaphone,
  MessageCircle,
  Package,
  PanelLeft,
  Receipt,
  RefreshCcw,
  ShoppingBag,
  Star,
  Store,
  Wallet,
} from 'lucide-react';
import { Providers } from './providers';

const SHELL_URL = process.env['NEXT_PUBLIC_SHELL_URL'] ?? 'http://localhost:3010';

type NavItem = { href: string; label: string; icon: LucideIcon; tone: string };
type NavSection = { label: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Tổng quan',
    items: [
      { href: '/dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard, tone: 'from-indigo-500/20 to-blue-500/8 text-indigo-700' },
      { href: '/analytics', label: 'Phân tích', icon: BarChart3, tone: 'from-sky-500/20 to-cyan-500/8 text-sky-700' },
      { href: '/orders', label: 'Đơn hàng', icon: ClipboardList, tone: 'from-amber-500/20 to-orange-500/8 text-amber-700' },
    ],
  },
  {
    label: 'Vận hành',
    items: [
      { href: '/products', label: 'Sản phẩm', icon: Package, tone: 'from-violet-500/20 to-fuchsia-500/8 text-violet-700' },
      { href: '/inventory', label: 'Kho hàng', icon: Boxes, tone: 'from-emerald-500/20 to-teal-500/8 text-emerald-700' },
      { href: '/promotions', label: 'Khuyến mãi', icon: Megaphone, tone: 'from-pink-500/20 to-rose-500/8 text-pink-700' },
      { href: '/payments', label: 'Thanh toán', icon: CreditCard, tone: 'from-cyan-500/20 to-blue-500/8 text-cyan-700' },
      { href: '/invoices', label: 'Hóa đơn', icon: Receipt, tone: 'from-slate-500/20 to-slate-400/8 text-slate-700' },
      { href: '/refunds', label: 'Hoàn tiền', icon: RefreshCcw, tone: 'from-orange-500/20 to-amber-500/8 text-orange-700' },
    ],
  },
  {
    label: 'Chăm sóc',
    items: [
      { href: '/chat', label: 'Chat khách hàng', icon: MessageCircle, tone: 'from-sky-500/20 to-indigo-500/8 text-sky-700' },
      { href: '/reviews', label: 'Đánh giá', icon: Star, tone: 'from-amber-500/20 to-yellow-500/8 text-amber-700' },
      { href: '/returns', label: 'Đổi trả', icon: ShoppingBag, tone: 'from-rose-500/20 to-fuchsia-500/8 text-rose-700' },
    ],
  },
  {
    label: 'Tài chính',
    items: [
      { href: '/wallets', label: 'Ví của tôi', icon: Wallet, tone: 'from-emerald-500/20 to-cyan-500/8 text-emerald-700' },
      { href: '/shop', label: 'Cửa hàng của tôi', icon: Store, tone: 'from-violet-500/20 to-purple-500/8 text-violet-700' },
    ],
  },
];

const FLAT_NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="vi">
      <body className="min-h-screen bg-[linear-gradient(180deg,#f5f3ff_0%,#faf5ff_18%,#f8fafc_100%)] text-slate-900">
        <Providers>
          <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-72 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.14),transparent_32%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_28%)]" />

          <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-full items-center justify-between gap-4 px-6 py-4">
              <div className="flex min-w-0 items-center gap-4">
                <Link href="/dashboard" className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <Store className="h-6 w-6 text-violet-600" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-slate-950">Kênh người bán</p>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Quản lý cửa hàng</p>
                  </div>
                </Link>
              </div>
              <div className="flex items-center gap-3">
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

          <div className="relative z-10 mx-auto flex max-w-full gap-6 px-6 py-6">
            <aside className="sticky top-[97px] hidden h-[calc(100vh-121px)] w-72 shrink-0 overflow-y-auto rounded-[28px] border border-white/70 bg-white/85 shadow-[0_24px_80px_-56px_rgba(15,23,42,0.45)] backdrop-blur xl:block">
              <div className="p-4">
                <div className="mb-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Cửa hàng</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">Bảng điều khiển</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Quản lý sản phẩm, theo dõi đơn hàng và chăm sóc khách hàng.
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
                          const active = item.href === '/dashboard'
                            ? pathname === '/dashboard'
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
              </div>
            </aside>

            <main className="min-w-0 flex-1">
              <div className="mb-5 flex flex-wrap items-center gap-2 xl:hidden">
                {FLAT_NAV_ITEMS.map((item) => {
                  const active = item.href === '/dashboard'
                    ? pathname === '/dashboard'
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
          <Toaster position="top-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
