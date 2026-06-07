'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, PackageCheck, TimerReset, Truck } from 'lucide-react';
import { formatVND } from '@lishop/shared';
import { adminApi, OrderStatus, AdminOrderItem } from '../../../lib/admin-api';
import { ORDER_STATUSES, STATUS_LABELS, STATUS_COLORS } from '../_constants';
import { AdminEmptyState } from '../_components/admin-empty-state';
import { AdminMetricCard } from '../_components/admin-metric-card';
import { AdminPageHeader } from '../_components/admin-page-header';

const PAGE_SIZE = 50;

function OrderRow({ order }: { order: AdminOrderItem }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (status: OrderStatus) => adminApi.updateOrderStatus(order.id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const displayStatus: OrderStatus = mutation.isPending ? mutation.variables! : order.status;

  const userName =
    order.user.firstName && order.user.lastName
      ? `${order.user.firstName} ${order.user.lastName}`
      : order.user.email;

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3 font-mono text-sm text-gray-700">#{order.orderNumber}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{userName}</td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatVND(order.totalVnd)}</td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {new Date(order.createdAt).toLocaleDateString('vi-VN')}
      </td>
      <td className="px-4 py-3">
        <select
          value={displayStatus}
          onChange={(e) => mutation.mutate(e.target.value as OrderStatus)}
          disabled={mutation.isPending}
          className={`cursor-pointer rounded-full border-0 px-2 py-1 text-xs font-medium disabled:opacity-50 ${STATUS_COLORS[displayStatus]}`}
        >
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>{STATUS_LABELS[status]}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">{order.itemCount} sp</td>
    </tr>
  );
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page],
    queryFn: () => adminApi.listOrders(page, PAGE_SIZE),
  });

  const orders: AdminOrderItem[] = data?.orders ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalVnd, 0);
  const processingOrders = orders.filter((order) => order.status === 'PROCESSING').length;
  const shippingOrders = orders.filter((order) => order.status === 'SHIPPED').length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={ClipboardCheck}
        title="Don hang"
        description="Khu dieu hanh luong don hang theo trang, giup doi van hanh cap nhat trang thai xu ly va theo doi nhanh tong gia tri dang hien thi."
        badge="Operations"
        tone="amber"
        stats={[
          { label: 'Tong don', value: isLoading ? '...' : `${total}` },
          { label: 'Dang xu ly', value: isLoading ? '...' : `${processingOrders}` },
          { label: 'Dang giao', value: isLoading ? '...' : `${shippingOrders}` },
          { label: 'Gia tri trang', value: isLoading ? '...' : formatVND(totalRevenue) },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard icon={PackageCheck} label="Don hien thi" value={isLoading ? '...' : `${orders.length}`} hint="So ban ghi tren trang hien tai" tone="indigo" />
        <AdminMetricCard icon={TimerReset} label="Dang xu ly" value={isLoading ? '...' : `${processingOrders}`} hint="Don can giai quyet tiep theo" tone="amber" />
        <AdminMetricCard icon={Truck} label="Dang giao" value={isLoading ? '...' : `${shippingOrders}`} hint="Don da vao pipeline shipment" tone="sky" />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            {isLoading ? 'Dang tai...' : `${total} don hang`}
          </h2>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="rounded border border-gray-200 px-2 py-1 disabled:opacity-40 hover:bg-gray-50"
              >
                ←
              </button>
              <span>{page} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                className="rounded border border-gray-200 px-2 py-1 disabled:opacity-40 hover:bg-gray-50"
              >
                →
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Ma don</th>
                <th className="px-4 py-2 text-left">Khach hang</th>
                <th className="px-4 py-2 text-left">Tong tien</th>
                <th className="px-4 py-2 text-left">Ngay dat</th>
                <th className="px-4 py-2 text-left">Trang thai</th>
                <th className="px-4 py-2 text-left">SL</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => <OrderRow key={order.id} order={order} />)}
            </tbody>
          </table>
          {!isLoading && orders.length === 0 && (
            <div className="p-4">
              <AdminEmptyState
                icon={ClipboardCheck}
                title="Chua co don hang"
                description="Khi backend bat dau tra du lieu order, bang xu ly va cac KPI phia tren se duoc cap nhat tu dong."
                tone="amber"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
