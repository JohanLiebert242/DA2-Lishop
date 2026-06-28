'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Store,
  Package,
  TrendingUp,
  ClipboardCheck,
  ShoppingBag,
  CircleDollarSign,
  Users,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { formatVND } from '@lishop/shared';
import { sellerApi } from '@/lib/seller-api';
import { SellerPageHeader } from '../_components/seller-page-header';
import { SellerMetricCard } from '../_components/seller-metric-card';
import { SellerEmptyState } from '../_components/seller-empty-state';
import { SHOP_STATUS_LABELS, SHOP_STATUS_COLORS } from '../_constants';

const QUICK_LINKS = [
  {
    href: '/products',
    label: 'Sản phẩm',
    description: 'Quản lý danh sách sản phẩm và thêm sản phẩm mới.',
    icon: Package,
    tone: 'from-violet-500/16 to-fuchsia-500/6 text-violet-700',
  },
  {
    href: '/orders',
    label: 'Đơn hàng',
    description: 'Theo dõi trạng thái đơn hàng và cập nhật xử lý.',
    icon: ClipboardCheck,
    tone: 'from-amber-500/16 to-orange-500/6 text-amber-700',
  },
  {
    href: '/analytics',
    label: 'Phân tích',
    description: 'Xem báo cáo doanh thu và hiệu suất bán hàng.',
    icon: TrendingUp,
    tone: 'from-sky-500/16 to-cyan-500/6 text-sky-700',
  },
  {
    href: '/wallets',
    label: 'Ví',
    description: 'Kiểm tra số dư và lịch sử giao dịch.',
    icon: CircleDollarSign,
    tone: 'from-emerald-500/16 to-teal-500/6 text-emerald-700',
  },
];

export default function DashboardPage() {
  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ['my-shop'],
    queryFn: () => sellerApi.getMyShop(),
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: () => sellerApi.getOrders(),
    refetchInterval: 30_000,
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['seller-products'],
    queryFn: () => sellerApi.getMyProducts({ limit: 100 }),
    refetchInterval: 30_000,
  });

  const isLoading = shopLoading || ordersLoading || productsLoading;

  const totalRevenue = orders.reduce((s, o) => s + o.totalVnd, 0);
  const totalOrders = orders.length;
  const totalProducts = productsData?.items.length ?? 0;
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED').length;
  const pendingOrders = orders.filter((o) => o.status === 'PENDING').length;

  if (!isLoading && !shop) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Store className="mb-3 h-12 w-12 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-900">Không tìm thấy cửa hàng</h2>
        <p className="mt-2 text-sm text-slate-500">Bạn chưa đăng ký cửa hàng hoặc phiên làm việc đã hết hạn.</p>
      </div>
    );
  }

  const badge = shop ? SHOP_STATUS_COLORS[shop.status] ?? 'bg-gray-100 text-gray-700' : '';
  const statusLabel = shop ? SHOP_STATUS_LABELS[shop.status] ?? shop.status : '';

  return (
    <div className="space-y-6">
      {shop && (
        <SellerPageHeader
          icon={Store}
          title={shop.name}
          description={shop.description ?? 'Chưa có mô tả cửa hàng'}
          badge={statusLabel}
          tone="violet"
          stats={[
            { label: 'Doanh thu', value: isLoading ? '...' : formatVND(totalRevenue) },
            { label: 'Đơn hàng', value: isLoading ? '...' : `${totalOrders}` },
            { label: 'Sản phẩm', value: isLoading ? '...' : `${totalProducts}` },
            { label: 'Đã giao', value: isLoading ? '...' : `${deliveredOrders}` },
          ]}
        />
      )}

      {shop?.status === 'REJECTED' && shop.rejectionReason && (
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <strong>Lý do từ chối:</strong> {shop.rejectionReason}
        </div>
      )}

      {shop?.status === 'PENDING' && (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Cửa hàng của bạn đang chờ admin phê duyệt. Bạn sẽ nhận được thông báo khi được duyệt.
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SellerMetricCard
          icon={CircleDollarSign}
          label="Doanh thu"
          value={isLoading ? '...' : formatVND(totalRevenue)}
          hint="Tổng doanh thu từ đơn hàng"
          tone="emerald"
        />
        <SellerMetricCard
          icon={ClipboardCheck}
          label="Đơn hàng"
          value={isLoading ? '...' : `${totalOrders}`}
          hint={`${pendingOrders} đơn chờ xử lý`}
          tone="indigo"
        />
        <SellerMetricCard
          icon={ShoppingBag}
          label="Đã giao"
          value={isLoading ? '...' : `${deliveredOrders}`}
          hint="Đơn giao thành công"
          tone="sky"
        />
        <SellerMetricCard
          icon={Package}
          label="Sản phẩm"
          value={isLoading ? '...' : `${totalProducts}`}
          hint="Trong cửa hàng"
          tone="violet"
        />
        <SellerMetricCard
          icon={TrendingUp}
          label="Tỉ lệ giao hàng"
          value={isLoading ? '...' : totalOrders > 0 ? `${Math.round((deliveredOrders / totalOrders) * 100)}%` : '—'}
          hint="Hiệu suất giao hàng"
          tone="amber"
        />
      </section>

      {shop?.status === 'APPROVED' && (
        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Đơn hàng gần đây</h2>
                <p className="mt-1 text-sm text-slate-500">{totalOrders} đơn hàng</p>
              </div>
              <Link href="/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                Xem tất cả
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {orders.length === 0 ? (
              <SellerEmptyState
                icon={ClipboardCheck}
                title="Chưa có đơn hàng"
                description="Khi khách hàng đặt sản phẩm, đơn hàng sẽ hiển thị tại đây."
              />
            ) : (
              <div className="space-y-2">
                {orders.slice(0, 5).map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:bg-slate-100"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">#{order.orderNumber}</p>
                      <p className="text-xs text-slate-500">{order.items.length} sản phẩm</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{formatVND(order.totalVnd)}</p>
                      <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Tác vụ nhanh</h2>
                <p className="mt-1 text-sm text-slate-500">Điều hướng nhanh tới các chức năng.</p>
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
      )}
    </div>
  );
}
