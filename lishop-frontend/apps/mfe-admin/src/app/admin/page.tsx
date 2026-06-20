'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CircleDollarSign,
  ClipboardCheck,
  PackageSearch,
  ShoppingBag,
  Ticket,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatVND } from '@lishop/shared';
import { adminApi } from '../../lib/admin-api';
import { AdminMetricCard } from './_components/admin-metric-card';
import { AdminPageHeader } from './_components/admin-page-header';
import { AdminEmptyState } from './_components/admin-empty-state';

const QUICK_LINKS = [
  {
    href: '/admin/orders',
    label: 'Đơn hàng',
    description: 'Theo dõi trạng thái giao và xử lý các đơn cần ưu tiên.',
    icon: ClipboardCheck,
    tone: 'from-indigo-500/16 to-blue-500/6 text-indigo-700',
  },
  {
    href: '/admin/products',
    label: 'Sản phẩm',
    description: 'Cập nhật danh mục, nội dung AI và nhập dữ liệu hàng loạt.',
    icon: ShoppingBag,
    tone: 'from-rose-500/16 to-pink-500/6 text-rose-700',
  },
  {
    href: '/admin/inventory',
    label: 'Tồn kho',
    description: 'Kiểm tra mức tồn thấp, lịch sử điều chỉnh và các cảnh báo.',
    icon: Boxes,
    tone: 'from-emerald-500/16 to-teal-500/6 text-emerald-700',
  },
  {
    href: '/admin/tickets',
    label: 'Hỗ trợ',
    description: 'Nhanh tay xử lý phiếu hỗ trợ, mục hỏi đáp và các tác vụ hậu mãi.',
    icon: Ticket,
    tone: 'from-sky-500/16 to-cyan-500/6 text-sky-700',
  },
];

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.getAnalytics(),
  });

  const isLoading = statsLoading || analyticsLoading;

  const lowStockCount = analytics?.lowStockProducts.length ?? 0;
  const pendingOrders =
    analytics?.orderStatusBreakdown.find((item) => item.status === 'PENDING')?.count ?? 0;
  const deliveredOrders =
    analytics?.orderStatusBreakdown.find((item) => item.status === 'DELIVERED')?.count ?? 0;
  const totalVisibleStatuses =
    analytics?.orderStatusBreakdown.reduce((sum, item) => sum + item.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={TrendingUp}
        title="Bảng điều khiển"
        description="Tổng hợp nhanh tình hình kinh doanh, vận hành và những điểm cần chú ý trong hệ thống Lishop. Từ đây bạn có thể nhìn doanh thu, đơn hàng, tồn kho và các luồng cần xử lý trong một màn hình duy nhất."
        badge="Báo cáo tổng quan"
        tone="indigo"
        stats={[
          { label: 'Tổng đơn hàng', value: stats ? `${stats.orderCount}` : '...' },
          { label: 'Tổng doanh thu', value: stats ? formatVND(stats.revenueVnd) : '...' },
          { label: 'Khách hàng', value: stats ? `${stats.userCount}` : '...' },
          { label: 'Sản phẩm', value: stats ? `${stats.productCount}` : '...' },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard
          icon={CircleDollarSign}
          label="Doanh thu 30 ngày"
          value={analytics ? formatVND(analytics.summary.revenueVnd) : '...'}
          hint="Tổng doanh thu đã ghi nhận trong chu kỳ gần nhất."
          tone="emerald"
        />
        <AdminMetricCard
          icon={ClipboardCheck}
          label="Đơn 30 ngày"
          value={analytics ? analytics.summary.orderCount.toLocaleString('vi-VN') : '...'}
          hint="Tổng số đơn hàng phát sinh trong vòng 30 ngày."
          tone="indigo"
        />
        <AdminMetricCard
          icon={Users}
          label="Khách mới"
          value={analytics ? analytics.summary.newUsers.toLocaleString('vi-VN') : '...'}
          hint="Lượng tài khoản mới trong chu kỳ báo cáo."
          tone="sky"
        />
        <AdminMetricCard
          icon={PackageSearch}
          label="Cần xử lý"
          value={pendingOrders.toLocaleString('vi-VN')}
          hint="Đơn chờ xác nhận để tránh chậm SLA."
          tone="amber"
        />
        <AdminMetricCard
          icon={AlertTriangle}
          label="Tồn kho thấp"
          value={lowStockCount.toLocaleString('vi-VN')}
          hint="Sản phẩm sắp hết cần theo dõi và bổ sung."
          tone="rose"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_380px]">
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Doanh thu theo ngày</h2>
              <p className="mt-1 text-sm text-slate-500">Mốc doanh thu gần nhất để đọc nhanh xung lực vận hành.</p>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              30 ngày gần nhất
            </span>
          </div>

          {isLoading ? (
            <div className="h-[280px] animate-pulse rounded-3xl bg-slate-100" />
          ) : !analytics || analytics.dailyRevenue.length === 0 ? (
            <AdminEmptyState
              icon={TrendingUp}
              title="Chưa có dữ liệu doanh thu"
              description="Khi hệ thống bắt đầu ghi nhận giao dịch, bảng điều khiển sẽ tự động hiển thị xu hướng để bạn so sánh từng ngày."
              tone="indigo"
            />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={analytics.dailyRevenue} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashboardRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(value) => String(value).slice(5)} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={52}
                  tickFormatter={(value) => `${(Number(value) / 1_000_000).toFixed(1)}tr`}
                />
                <Tooltip
                  formatter={(value) => [formatVND(Number(value ?? 0)), 'Doanh thu']}
                  labelFormatter={(label) => `Ngày ${String(label)}`}
                />
                <Area type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={3} fill="url(#dashboardRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
            <h2 className="text-lg font-semibold text-slate-950">Trạng thái đơn hàng</h2>
            <p className="mt-1 text-sm text-slate-500">Phân bổ luồng xử lý để nhìn ra điểm nghẽn vận hành.</p>
            {isLoading ? (
              <div className="mt-5 h-52 animate-pulse rounded-3xl bg-slate-100" />
            ) : !analytics || analytics.orderStatusBreakdown.length === 0 ? (
              <div className="mt-5">
                <AdminEmptyState
                  icon={ClipboardCheck}
                  title="Chưa có trạng thái đơn hàng"
                  description="Biểu đồ phân bổ sẽ xuất hiện ngay khi API phân tích trả dữ liệu theo từng nhóm xử lý."
                  tone="amber"
                />
              </div>
            ) : (
              <div className="mt-5">
                <ResponsiveContainer width="100%" height={208}>
                  <BarChart data={analytics.orderStatusBreakdown} margin={{ top: 8, right: 0, left: -14, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={36} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0f172a" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Đã giao</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{deliveredOrders}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Tổng luồng hiển thị</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{totalVisibleStatuses}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-[0_18px_48px_-40px_rgba(251,146,60,0.4)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Điểm cần chú ý</h2>
                <p className="text-sm text-slate-600">Các điểm cần xử lý ngay để bảng điều khiển giữ nhịp vận hành ổn định.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-white/90 p-4">
                <p className="text-sm font-semibold text-slate-900">{pendingOrders} đơn đang chờ xác nhận</p>
                <p className="mt-1 text-sm text-slate-500">Tập trung vào xử lý cho đơn mới để tránh trễ hạn SLA.</p>
              </div>
              <div className="rounded-2xl bg-white/90 p-4">
                <p className="text-sm font-semibold text-slate-900">{lowStockCount} sản phẩm tồn kho thấp</p>
                <p className="mt-1 text-sm text-slate-500">Cần đối chiếu tồn kho và ưu tiên bổ sung các mã hàng bán nhanh.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Sản phẩm nổi bật</h2>
              <p className="mt-1 text-sm text-slate-500">Nhanh tay nhìn ra các mã hàng đang kéo doanh thu trong giai đoạn gần nhất.</p>
            </div>
            <Link href="/admin/products" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
              Mở danh mục
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          ) : !analytics || analytics.topProducts.length === 0 ? (
            <AdminEmptyState
              icon={ShoppingBag}
              title="Chưa có sản phẩm nổi bật"
              description="Bảng điều khiển sẽ xếp hạng các sản phẩm có doanh thu cao nhất khi dữ liệu phân tích sẵn sàng."
              tone="rose"
            />
          ) : (
            <div className="space-y-3">
              {analytics.topProducts.map((product, index) => (
                <div key={product.productId} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-500 shadow-sm">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-950">{product.productName}</p>
                    <p className="mt-1 text-sm text-slate-500">Doanh thu ghi nhận: {formatVND(product.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Tác vụ nhanh</h2>
              <p className="mt-1 text-sm text-slate-500">Lựa chọn lộ trình điều hướng nhanh tới các nhóm tác vụ quan trọng.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {QUICK_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-lg hover:shadow-slate-200/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${item.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
                  </div>
                  <p className="mt-4 text-base font-semibold text-slate-950">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
