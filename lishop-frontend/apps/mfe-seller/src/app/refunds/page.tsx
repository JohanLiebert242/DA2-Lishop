'use client';

import { useQuery } from '@tanstack/react-query';
import { RefreshCcw, CircleDollarSign, CheckCircle2, Clock } from 'lucide-react';
import { formatVND } from '@lishop/shared';
import { sellerApi } from '@/lib/seller-api';
import { REFUND_STATUS_LABELS, REFUND_STATUS_COLORS } from '../_constants';
import { SellerPageHeader } from '../_components/seller-page-header';
import { SellerMetricCard } from '../_components/seller-metric-card';
import { SellerEmptyState } from '../_components/seller-empty-state';

export default function RefundsPage() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: () => sellerApi.getOrders(),
  });

  const refundedOrders = orders.filter((o) => o.status === 'REFUNDED');

  const totalRefunded = refundedOrders.reduce((s, o) => s + o.totalVnd, 0);

  return (
    <div className="space-y-6">
      <SellerPageHeader
        icon={RefreshCcw}
        title="Hoàn tiền"
        description="Theo dõi các đơn hàng đã hoàn tiền cho khách hàng."
        badge="Vận hành"
        tone="orange"
        stats={[
          { label: 'Đã hoàn tiền', value: isLoading ? '...' : `${refundedOrders.length}` },
          { label: 'Tổng tiền hoàn', value: isLoading ? '...' : formatVND(totalRefunded) },
          { label: 'Tỉ lệ hoàn tiền', value: isLoading ? '...' : orders.length > 0 ? `${((refundedOrders.length / orders.length) * 100).toFixed(1)}%` : '—' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SellerMetricCard icon={CircleDollarSign} label="Tổng tiền hoàn" value={isLoading ? '...' : formatVND(totalRefunded)} hint="Tổng số tiền đã hoàn" tone="orange" />
        <SellerMetricCard icon={CheckCircle2} label="Số đơn hoàn" value={isLoading ? '...' : `${refundedOrders.length}`} hint="Số đơn đã hoàn tiền" tone="indigo" />
        <SellerMetricCard icon={Clock} label="Tổng đơn" value={isLoading ? '...' : `${orders.length}`} hint="Tổng số đơn hàng" tone="sky" />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            {isLoading ? 'Đang tải...' : `${refundedOrders.length} đơn hoàn tiền`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Mã đơn</th>
                <th className="px-5 py-3 text-left">Khách hàng</th>
                <th className="px-5 py-3 text-left">Số tiền</th>
                <th className="px-5 py-3 text-left">Trạng thái</th>
                <th className="px-5 py-3 text-left">Ngày đặt</th>
              </tr>
            </thead>
            <tbody>
              {refundedOrders.map((order) => (
                <tr key={order.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-4 text-sm font-mono text-slate-700">#{order.orderNumber}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {order.user.firstName} {order.user.lastName}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-900">{formatVND(order.totalVnd)}</td>
                  <td className="px-5 py-4">
                    <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      Đã hoàn tiền
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && refundedOrders.length === 0 && (
            <div className="p-5">
              <SellerEmptyState
                icon={RefreshCcw}
                title="Chưa có hoàn tiền"
                description="Khi có đơn hàng được hoàn tiền, danh sách sẽ hiển thị tại đây."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
