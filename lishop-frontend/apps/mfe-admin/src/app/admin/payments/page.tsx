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
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b px-4 py-3">
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
            {payments.map((payment) => {
              const userName =
                payment.order.user.firstName && payment.order.user.lastName
                  ? `${payment.order.user.firstName} ${payment.order.user.lastName}`
                  : payment.order.user.email;
              return (
                <tr key={payment.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm text-gray-700">#{payment.order.orderNumber}</td>
                  <td className="max-w-[140px] truncate px-4 py-3 text-sm text-gray-700">{userName}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatVND(payment.amountVnd)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STATUS_COLORS[payment.status as PaymentStatus] ?? 'bg-gray-100 text-gray-700'}`}>
                      {PAYMENT_STATUS_LABELS[payment.status as PaymentStatus] ?? payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(payment.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    {payment.status === 'PENDING' && payment.method === 'COD' && (
                      <button
                        type="button"
                        onClick={() => confirmPaymentMutation.mutate(payment.orderId)}
                        disabled={confirmPaymentMutation.isPending}
                        className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {confirmPaymentMutation.isPending ? 'Đang xác nhận...' : 'Xác nhận tiền mặt'}
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
