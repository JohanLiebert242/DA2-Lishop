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
  const handoffMutation = useMutation({
    mutationFn: () =>
      adminApi.addTrackingEvent(order.id, {
        status: 'PICKED_UP',
        description: 'Đơn hàng đã được bàn giao cho đơn vị vận chuyển.',
      }),
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
      <td className="px-4 py-3">
        {order.status === 'PROCESSING' ? (
          <button
            type="button"
            onClick={() => handoffMutation.mutate()}
            disabled={handoffMutation.isPending}
            className="rounded-md bg-sky-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-sky-700 disabled:opacity-50"
          >
            {handoffMutation.isPending ? 'Đang bàn giao...' : 'Bàn giao VC'}
          </button>
        ) : (
          <span className="text-xs text-gray-400">
            {order.status === 'SHIPPED' ? 'Đang vận chuyển' : '—'}
          </span>
        )}
      </td>
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
        title="Đơn hàng"
        description="Khu điều hành luồng đơn hàng theo trang, giúp đội vận hành cập nhật trạng thái xử lý và theo dõi nhanh tổng giá trị đang hiển thị."
        badge="Vận hành"
        tone="amber"
        stats={[
          { label: 'Tổng đơn', value: isLoading ? '...' : `${total}` },
          { label: 'Đang xử lý', value: isLoading ? '...' : `${processingOrders}` },
          { label: 'Đang giao', value: isLoading ? '...' : `${shippingOrders}` },
          { label: 'Giá trị trang', value: isLoading ? '...' : formatVND(totalRevenue) },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard icon={PackageCheck} label="Đơn hiển thị" value={isLoading ? '...' : `${orders.length}`} hint="Số bản ghi trên trang hiện tại" tone="indigo" />
        <AdminMetricCard icon={TimerReset} label="Đang xử lý" value={isLoading ? '...' : `${processingOrders}`} hint="Đơn cần giải quyết tiếp theo" tone="amber" />
        <AdminMetricCard icon={Truck} label="Đang giao" value={isLoading ? '...' : `${shippingOrders}`} hint="Đơn đã vào luồng giao vận" tone="sky" />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            {isLoading ? 'Đang tải...' : `${total} đơn hàng`}
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
                <th className="px-4 py-2 text-left">Mã đơn</th>
                <th className="px-4 py-2 text-left">Khách hàng</th>
                <th className="px-4 py-2 text-left">Tổng tiền</th>
                <th className="px-4 py-2 text-left">Ngày đặt</th>
                <th className="px-4 py-2 text-left">Trạng thái</th>
                <th className="px-4 py-2 text-left">SL</th>
                <th className="px-4 py-2 text-left">Luồng gợi ý</th>
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
                title="Chưa có đơn hàng"
                description="Khi backend bắt đầu trả dữ liệu đơn hàng, bảng xử lý và các KPI phía trên sẽ được cập nhật tự động."
                tone="amber"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
