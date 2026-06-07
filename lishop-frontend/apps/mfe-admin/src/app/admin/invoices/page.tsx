'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatVND } from '@lishop/shared';
import { adminApi, AdminInvoice } from '../../../lib/admin-api';

export default function InvoicesPage() {
  const queryClient = useQueryClient();

  const { data: adminInvoices = [], isLoading } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: () => adminApi.getInvoices(),
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: (orderId: string) => adminApi.generateInvoice(orderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-invoices'] }),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">
          {isLoading ? 'Đang tải...' : `${adminInvoices.length} hóa đơn`}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Số hóa đơn</th>
              <th className="px-4 py-2 text-left">Đơn hàng</th>
              <th className="px-4 py-2 text-left">Khách hàng</th>
              <th className="px-4 py-2 text-left">Tổng tiền (có VAT)</th>
              <th className="px-4 py-2 text-left">VAT</th>
              <th className="px-4 py-2 text-left">Ngày tạo</th>
              <th className="px-4 py-2 text-left">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {adminInvoices.map((invoice: AdminInvoice) => (
              <tr key={invoice.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm text-gray-700">{invoice.invoiceNo}</td>
                <td className="px-4 py-3 font-mono text-sm text-gray-700">{invoice.orderId.slice(0, 8)}…</td>
                <td className="px-4 py-3 text-sm text-gray-700">{invoice.billingName}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatVND(invoice.totalVnd)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {invoice.vatPercent}% ({formatVND(invoice.vatVnd)})
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(invoice.issuedAt).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => generateInvoiceMutation.mutate(invoice.orderId)}
                    disabled={generateInvoiceMutation.isPending}
                    className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {generateInvoiceMutation.isPending ? 'Đang tạo...' : 'Tạo lại'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && adminInvoices.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có hóa đơn nào.</p>
        )}
      </div>
    </div>
  );
}
