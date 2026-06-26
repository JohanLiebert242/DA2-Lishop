'use client';

import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, RotateCcw, PackageSearch, AlertCircle } from 'lucide-react';
import { formatVND } from '@lishop/shared';
import { sellerApi } from '@/lib/seller-api';
import { RETURN_STATUS_LABELS, RETURN_STATUS_COLORS } from '../_constants';
import { SellerPageHeader } from '../_components/seller-page-header';
import { SellerMetricCard } from '../_components/seller-metric-card';
import { SellerEmptyState } from '../_components/seller-empty-state';

export default function ReturnsPage() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: () => sellerApi.getOrders(),
  });

  const cancellations = orders.filter((o) => o.status === 'CANCELLED' || o.status === 'REFUNDED');
  const returnedOrders = orders.filter((o) => o.status === 'REFUNDED');
  const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED');
  const pendingOrders = orders.filter((o) => o.status === 'PENDING' || o.status === 'PROCESSING');

  return (
    <div className="space-y-6">
      <SellerPageHeader
        icon={ShoppingBag}
        title="Đổi trả"
        description="Quản lý các yêu cầu đổi trả và đơn hàng hoàn lại từ khách hàng."
        badge="Chăm sóc"
        tone="rose"
        stats={[
          { label: 'Tổng đơn hàng', value: isLoading ? '...' : `${orders.length}` },
          { label: 'Đã hủy', value: isLoading ? '...' : `${cancelledOrders.length}` },
          { label: 'Đã hoàn tiền', value: isLoading ? '...' : `${returnedOrders.length}` },
          { label: 'Đang xử lý', value: isLoading ? '...' : `${pendingOrders.length}` },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SellerMetricCard icon={RotateCcw} label="Đã hoàn tiền" value={isLoading ? '...' : `${returnedOrders.length}`} hint="Đơn đã hoàn tiền cho khách" tone="rose" />
        <SellerMetricCard icon={AlertCircle} label="Đã hủy" value={isLoading ? '...' : `${cancelledOrders.length}`} hint="Đơn đã bị hủy" tone="amber" />
        <SellerMetricCard icon={PackageSearch} label="Tỉ lệ hoàn/đơn" value={isLoading ? '...' : orders.length > 0 ? `${((returnedOrders.length / orders.length) * 100).toFixed(1)}%` : '—'} hint="Tỉ lệ đơn hoàn tiền" tone="indigo" />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            {isLoading ? 'Đang tải...' : `${cancellations.length} đơn hủy/hoàn tiền`}
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
                <th className="px-5 py-3 text-left">Số lượng</th>
                <th className="px-5 py-3 text-left">Ngày đặt</th>
              </tr>
            </thead>
            <tbody>
              {cancellations.map((order) => (
                <tr key={order.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-4 text-sm font-mono text-slate-700">#{order.orderNumber}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {order.user.firstName} {order.user.lastName}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-900">{formatVND(order.totalVnd)}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${order.status === 'REFUNDED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                      {order.status === 'REFUNDED' ? 'Đã hoàn tiền' : 'Đã hủy'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">{order.items.length} sp</td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && cancellations.length === 0 && (
            <div className="p-5">
              <SellerEmptyState
                icon={ShoppingBag}
                title="Chưa có đổi trả"
                description="Chưa có đơn hàng nào bị hủy hoặc hoàn tiền."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
