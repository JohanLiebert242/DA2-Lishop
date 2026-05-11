'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatVND } from '@lishop/shared';
import { adminApi, AdminRefund } from '../../../lib/admin-api';
import { REFUND_METHOD_LABELS, REFUND_STATUS_COLORS, REFUND_STATUS_LABELS } from '../_constants';

export default function RefundsPage() {
  const queryClient = useQueryClient();

  const { data: adminRefunds = [], isLoading } = useQuery({
    queryKey: ['admin-refunds'],
    queryFn: () => adminApi.getRefunds(),
  });

  const processRefundMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => adminApi.processRefund(id, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-refunds'] }),
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h2 className="text-sm font-semibold text-gray-900">
          {isLoading ? 'Đang tải...' : `${adminRefunds.length} yêu cầu hoàn tiền`}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Đơn hàng</th>
              <th className="px-4 py-2 text-left">Khách hàng</th>
              <th className="px-4 py-2 text-left">Số tiền</th>
              <th className="px-4 py-2 text-left">Phương thức</th>
              <th className="px-4 py-2 text-left">Trạng thái</th>
              <th className="px-4 py-2 text-left">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {adminRefunds.map((refund: AdminRefund) => (
              <tr key={refund.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm text-gray-700">#{refund.order.orderNumber}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {refund.user.firstName && refund.user.lastName
                    ? `${refund.user.firstName} ${refund.user.lastName}`
                    : refund.user.email}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {formatVND(refund.amountVnd)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {REFUND_METHOD_LABELS[refund.method] ?? refund.method}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${REFUND_STATUS_COLORS[refund.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {REFUND_STATUS_LABELS[refund.status] ?? refund.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {refund.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => processRefundMutation.mutate({ id: refund.id })}
                      disabled={processRefundMutation.isPending}
                      className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {processRefundMutation.isPending ? 'Đang xử lý...' : 'Xử lý'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && adminRefunds.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có yêu cầu hoàn tiền.</p>
        )}
      </div>
    </div>
  );
}
