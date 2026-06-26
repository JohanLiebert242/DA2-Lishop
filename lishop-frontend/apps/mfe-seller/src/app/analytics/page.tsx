'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  CircleDollarSign,
  ClipboardCheck,
  ShoppingBag,
  Users,
  TrendingUp,
  ArrowUpRight,
  Package,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart as BarChartRechart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatVND } from '@lishop/shared';
import { sellerApi } from '@/lib/seller-api';
import { SellerPageHeader } from '../_components/seller-page-header';
import { SellerMetricCard } from '../_components/seller-metric-card';
import { SellerEmptyState } from '../_components/seller-empty-state';

export default function AnalyticsPage() {
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: () => sellerApi.getOrders(),
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['seller-products'],
    queryFn: () => sellerApi.getMyProducts({ limit: 100 }),
  });

  const isLoading = ordersLoading || productsLoading;

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalVnd, 0);
  const totalOrders = orders.length;
  const totalProducts = productsData?.items.length ?? 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED').length;

  const revenueByDate = orders.reduce<Record<string, number>>((acc, order) => {
    const date = new Date(order.createdAt).toISOString().slice(0, 10);
    acc[date] = (acc[date] ?? 0) + order.totalVnd;
    return acc;
  }, {});

  const dailyRevenue = Object.entries(revenueByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, amount]) => ({ date, amount }));

  const statusBreakdown = orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});

  const orderStatusData = Object.entries(statusBreakdown).map(([status, count]) => ({ status, count }));

  const topProducts = orders
    .flatMap((order) => order.items)
    .reduce<Record<string, { name: string; revenue: number; quantity: number }>>((acc, item) => {
      const entry = acc[item.productId] ?? { name: item.productName, revenue: 0, quantity: 0 };
      entry.revenue += item.totalPriceVnd;
      entry.quantity += item.quantity;
      acc[item.productId] = entry;
      return acc;
    }, {});

  const topProductsEntries = Object.entries(topProducts) as [string, { name: string; revenue: number; quantity: number }][];
  const topProductsList = topProductsEntries
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <SellerPageHeader
        icon={BarChart3}
        title="Phân tích bán hàng"
        description="Tổng quan hiệu suất cửa hàng, xu hướng doanh thu và các chỉ số kinh doanh chính."
        badge="Báo cáo"
        tone="sky"
        stats={[
          { label: 'Tổng doanh thu', value: isLoading ? '...' : formatVND(totalRevenue) },
          { label: 'Tổng đơn hàng', value: isLoading ? '...' : `${totalOrders}` },
          { label: 'Giá trị TB đơn', value: isLoading ? '...' : formatVND(Math.round(avgOrderValue)) },
          { label: 'Sản phẩm đã bán', value: isLoading ? '...' : `${orders.reduce((s, o) => s + o.items.length, 0)}` },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SellerMetricCard
          icon={CircleDollarSign}
          label="Doanh thu"
          value={isLoading ? '...' : formatVND(totalRevenue)}
          hint="Tổng doanh thu từ tất cả đơn hàng"
          tone="emerald"
        />
        <SellerMetricCard
          icon={ClipboardCheck}
          label="Đơn đã giao"
          value={isLoading ? '...' : `${deliveredOrders}`}
          hint="Số đơn đã giao thành công"
          tone="indigo"
        />
        <SellerMetricCard
          icon={ShoppingBag}
          label="Sản phẩm"
          value={isLoading ? '...' : `${totalProducts}`}
          hint="Tổng sản phẩm trong cửa hàng"
          tone="sky"
        />
        <SellerMetricCard
          icon={TrendingUp}
          label="Tỉ lệ giao hàng"
          value={isLoading ? '...' : totalOrders > 0 ? `${Math.round((deliveredOrders / totalOrders) * 100)}%` : '—'}
          hint="Phần trăm đơn đã giao thành công"
          tone="amber"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_380px]">
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Doanh thu theo ngày</h2>
              <p className="mt-1 text-sm text-slate-500">Biểu đồ doanh thu 30 ngày gần nhất.</p>
            </div>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              30 ngày
            </span>
          </div>
          {isLoading ? (
            <div className="h-[280px] animate-pulse rounded-3xl bg-slate-100" />
          ) : dailyRevenue.length === 0 ? (
            <SellerEmptyState
              icon={BarChart3}
              title="Chưa có dữ liệu doanh thu"
              description="Khi có đơn hàng, biểu đồ doanh thu sẽ hiển thị tại đây."
            />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyRevenue} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesRevenue" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={3} fill="url(#salesRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
            <h2 className="text-lg font-semibold text-slate-950">Trạng thái đơn hàng</h2>
            <p className="mt-1 text-sm text-slate-500">Phân bổ trạng thái đơn hàng.</p>
            {isLoading ? (
              <div className="mt-5 h-52 animate-pulse rounded-3xl bg-slate-100" />
            ) : orderStatusData.length === 0 ? (
              <div className="mt-5">
                <SellerEmptyState
                  icon={ClipboardCheck}
                  title="Chưa có đơn hàng"
                  description="Phân bổ trạng thái sẽ hiển thị khi có đơn hàng."
                />
              </div>
            ) : (
              <div className="mt-5">
                <ResponsiveContainer width="100%" height={208}>
                  <BarChartRechart data={orderStatusData} margin={{ top: 8, right: 0, left: -14, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={36} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0f172a" radius={[8, 8, 0, 0]} />
                  </BarChartRechart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-[0_18px_48px_-40px_rgba(251,146,60,0.4)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Tổng quan nhanh</h2>
                <p className="text-sm text-slate-600">Các chỉ số chính từ dữ liệu cửa hàng.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-white/90 p-4">
                <p className="text-sm font-semibold text-slate-900">{totalOrders} đơn hàng</p>
                <p className="mt-1 text-sm text-slate-500">{deliveredOrders} đơn đã giao thành công.</p>
              </div>
              <div className="rounded-2xl bg-white/90 p-4">
                <p className="text-sm font-semibold text-slate-900">{totalProducts} sản phẩm</p>
                <p className="mt-1 text-sm text-slate-500">Tổng sản phẩm đang bán trong cửa hàng.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Sản phẩm bán chạy</h2>
            <p className="mt-1 text-sm text-slate-500">Top sản phẩm có doanh thu cao nhất.</p>
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ) : topProductsList.length === 0 ? (
          <SellerEmptyState
            icon={Package}
            title="Chưa có dữ liệu"
            description="Sản phẩm bán chạy sẽ hiển thị khi có đơn hàng."
          />
        ) : (
          <div className="space-y-3">
            {topProductsList.map(([, product], index) => (
              <div key={product.name} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-500 shadow-sm">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-950">{product.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Doanh thu: {formatVND(product.revenue)} · {product.quantity} sản phẩm
                  </p>
                </div>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-emerald-500" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
