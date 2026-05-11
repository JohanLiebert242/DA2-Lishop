'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatVND } from '@lishop/shared';
import { adminApi, PaymentStatus } from '../../../lib/admin-api';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from '../_constants';

export default function PaymentsPage() {
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: () => adminApi.getPayments(),
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: (orderId: string) => adminApi.confirmPaymentAdmin(orderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-payments'] }),
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h2 className="text-sm font-semibold text-gray-900">
          {isLoading ? 'Đang tải...' : `${payments.length} giao dịch`}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Đơn hàng</th>
              <th className="px-4 py-2 text-left">Khách hàng</th>
              <th className="px-4 py-2 text-left">Phương thức</th>
              <th className="px-4 py-2 text-left">Số tiền</th>
              <th className="px-4 py-2 text-left">Trạng thái</th>
              <th className="px-4 py-2 text-left">Ngày</th>
              <th className="px-4 py-2 text-left">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => {
              const userName =
                p.order.user.firstName && p.order.user.lastName
                  ? `${p.order.user.firstName} ${p.order.user.lastName}`
                  : p.order.user.email;
              return (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm text-gray-700">#{p.order.orderNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-[140px] truncate">{userName}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatVND(p.amountVnd)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STATUS_COLORS[p.status as PaymentStatus] ?? 'bg-gray-100 text-gray-700'}`}>
                      {PAYMENT_STATUS_LABELS[p.status as PaymentStatus] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    {p.status === 'PENDING' && p.method === 'COD' && (
                      <button
                        type="button"
                        onClick={() => confirmPaymentMutation.mutate(p.orderId)}
                        disabled={confirmPaymentMutation.isPending}
                        className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {confirmPaymentMutation.isPending ? 'Đang xác nhận...' : 'Xác nhận COD'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!isLoading && payments.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có giao dịch nào.</p>
        )}
      </div>
    </div>
  );
}
