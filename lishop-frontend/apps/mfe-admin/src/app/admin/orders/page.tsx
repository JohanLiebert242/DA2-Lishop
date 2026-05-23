'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatVND } from '@lishop/shared';
import { adminApi, OrderStatus, AdminOrderItem } from '../../../lib/admin-api';
import { ORDER_STATUSES, STATUS_LABELS, STATUS_COLORS } from '../_constants';

const PAGE_SIZE = 50;

function OrderRow({ order }: { order: AdminOrderItem }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (s: OrderStatus) => adminApi.updateOrderStatus(order.id, s),
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
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
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

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">
          {isLoading ? 'Đang tải...' : `${total} đơn hàng`}
        </h2>
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded border border-gray-200 px-2 py-1 disabled:opacity-40 hover:bg-gray-50"
            >
              ←
            </button>
            <span>{page} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => <OrderRow key={order.id} order={order} />)}
          </tbody>
        </table>
        {!isLoading && orders.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có đơn hàng.</p>
        )}
      </div>
    </div>
  );
}
