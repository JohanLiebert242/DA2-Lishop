'use client';

import { useQuery } from '@tanstack/react-query';
import { ClipboardList, ClipboardCheck, PackageCheck, TimerReset, Truck } from 'lucide-react';
import Link from 'next/link';
import { formatVND } from '@lishop/shared';
import { sellerApi } from '@/lib/seller-api';
import { STATUS_LABELS, STATUS_COLORS, ORDER_STATUSES } from '../_constants';
import { SellerPageHeader } from '../_components/seller-page-header';
import { SellerMetricCard } from '../_components/seller-metric-card';
import { SellerEmptyState } from '../_components/seller-empty-state';

export default function OrdersPage() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: () => sellerApi.getOrders(),
  });

  const totalRevenue = orders.reduce((s, o) => s + o.totalVnd, 0);
  const processingOrders = orders.filter((o) => o.status === 'PROCESSING').length;
  const shippingOrders = orders.filter((o) => o.status === 'SHIPPED').length;
  const pendingOrders = orders.filter((o) => o.status === 'PENDING').length;

  const orderStatusLabel = (status: string) =>
    STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status;

  const orderStatusColor = (status: string) =>
    STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? 'bg-gray-100 text-gray-700';

  return (
    <div className="space-y-6">
      <SellerPageHeader
        icon={ClipboardList}
        title="Đơn hàng"
        description="Theo dõi và quản lý đơn hàng có chứa sản phẩm của cửa hàng bạn."
        badge="Tổng quan"
        tone="amber"
        stats={[
          { label: 'Tổng đơn', value: isLoading ? '...' : `${orders.length}` },
          { label: 'Chờ xác nhận', value: isLoading ? '...' : `${pendingOrders}` },
          { label: 'Đang giao', value: isLoading ? '...' : `${shippingOrders}` },
          { label: 'Doanh thu', value: isLoading ? '...' : formatVND(totalRevenue) },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <SellerMetricCard icon={ClipboardCheck} label="Tổng đơn" value={isLoading ? '...' : `${orders.length}`} hint="Tổng số đơn hàng" tone="indigo" />
        <SellerMetricCard icon={TimerReset} label="Chờ xác nhận" value={isLoading ? '...' : `${pendingOrders}`} hint="Cần xử lý" tone="amber" />
        <SellerMetricCard icon={PackageCheck} label="Đang xử lý" value={isLoading ? '...' : `${processingOrders}`} hint="Đơn đang xử lý" tone="sky" />
        <SellerMetricCard icon={Truck} label="Đang giao" value={isLoading ? '...' : `${shippingOrders}`} hint="Đang vận chuyển" tone="purple" />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            {isLoading ? 'Đang tải...' : `${orders.length} đơn hàng`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Mã đơn</th>
                <th className="px-5 py-3 text-left">Khách hàng</th>
                <th className="px-5 py-3 text-left">Sản phẩm</th>
                <th className="px-5 py-3 text-left">Tổng tiền</th>
                <th className="px-5 py-3 text-left">Trạng thái</th>
                <th className="px-5 py-3 text-left">Ngày đặt</th>
                <th className="px-5 py-3 text-left" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-4 font-mono text-sm font-medium text-slate-900">
                    #{order.orderNumber}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {order.user.firstName} {order.user.lastName}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {order.items.length} sản phẩm
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-900">
                    {formatVND(order.totalVnd)}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${orderStatusColor(order.status)}`}>
                      {orderStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/orders/${order.id}`}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && orders.length === 0 && (
            <div className="p-5">
              <SellerEmptyState
                icon={ClipboardList}
                title="Chưa có đơn hàng nào"
                description="Khi khách hàng đặt sản phẩm của bạn, đơn hàng sẽ hiện ở đây."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
