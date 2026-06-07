'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleDollarSign, RefreshCcw, Sparkles, Wallet } from 'lucide-react';
import { formatVND } from '@lishop/shared';
import { adminApi, AdminRefund } from '../../../lib/admin-api';
import { REFUND_METHOD_LABELS, REFUND_STATUS_COLORS, REFUND_STATUS_LABELS } from '../_constants';
import { AdminEmptyState } from '../_components/admin-empty-state';
import { AdminMetricCard } from '../_components/admin-metric-card';
import { AdminPageHeader } from '../_components/admin-page-header';

export default function RefundsPage() {
  const queryClient = useQueryClient();
  const [aiNotes, setAiNotes] = useState<Record<string, string>>({});

  const { data: adminRefunds = [], isLoading } = useQuery({
    queryKey: ['admin-refunds'],
    queryFn: () => adminApi.getRefunds(),
  });

  const processRefundMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => adminApi.processRefund(id, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-refunds'] }),
  });

  const aiAssistMutation = useMutation({
    mutationFn: (id: string) => adminApi.generateRefundAiAssist(id),
    onSuccess: (result, id) => {
      const text = result.fallback ? `AI fallback: ${result.summary}` : result.summary;
      setAiNotes((prev) => ({ ...prev, [id]: result.adminNote ? `${text} - ${result.adminNote}` : text }));
    },
    onError: (err: Error, id) => setAiNotes((prev) => ({ ...prev, [id]: err.message })),
  });

  const pendingRefunds = adminRefunds.filter((refund) => refund.status === 'PENDING').length;
  const totalAmount = adminRefunds.reduce((sum, refund) => sum + refund.amountVnd, 0);
  const walletRefunds = adminRefunds.filter((refund) => refund.method === 'WALLET').length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={RefreshCcw}
        title="Hoan tien"
        description="Khu xu ly refund cho cac don can hoan, cho phep xem hinh thuc hoan, tong gia tri va nhan goi y AI cho ghi chu van hanh."
        badge="After-sales"
        tone="amber"
        stats={[
          { label: 'Tong refund', value: isLoading ? '...' : `${adminRefunds.length}` },
          { label: 'Dang cho', value: isLoading ? '...' : `${pendingRefunds}` },
          { label: 'Tong gia tri', value: isLoading ? '...' : formatVND(totalAmount) },
          { label: 'Hoan vao vi', value: isLoading ? '...' : `${walletRefunds}` },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard icon={CircleDollarSign} label="Tong gia tri" value={isLoading ? '...' : formatVND(totalAmount)} hint="Gia tri refund dang hien thi" tone="indigo" />
        <AdminMetricCard icon={RefreshCcw} label="Dang cho xu ly" value={isLoading ? '...' : `${pendingRefunds}`} hint="Refund can thao tac tiep theo" tone="amber" />
        <AdminMetricCard icon={Wallet} label="Hoan ve vi" value={isLoading ? '...' : `${walletRefunds}`} hint="Refund route ve wallet" tone="emerald" />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            {isLoading ? 'Dang tai...' : `${adminRefunds.length} yeu cau hoan tien`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Don hang</th>
                <th className="px-4 py-2 text-left">Khach hang</th>
                <th className="px-4 py-2 text-left">So tien</th>
                <th className="px-4 py-2 text-left">Phuong thuc</th>
                <th className="px-4 py-2 text-left">Trang thai</th>
                <th className="px-4 py-2 text-left">Thao tac</th>
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
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatVND(refund.amountVnd)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{REFUND_METHOD_LABELS[refund.method] ?? refund.method}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${REFUND_STATUS_COLORS[refund.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {REFUND_STATUS_LABELS[refund.status] ?? refund.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {refund.status === 'PENDING' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => aiAssistMutation.mutate(refund.id)}
                          disabled={aiAssistMutation.isPending}
                          data-testid={`refund-ai-${refund.id}`}
                          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          {aiAssistMutation.isPending ? 'AI dang goi y...' : 'AI goi y'}
                        </button>
                        <button
                          type="button"
                          onClick={() => processRefundMutation.mutate({ id: refund.id })}
                          disabled={processRefundMutation.isPending}
                          className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {processRefundMutation.isPending ? 'Dang xu ly...' : 'Xu ly'}
                        </button>
                      </div>
                    ) : null}
                    {aiNotes[refund.id] ? (
                      <p className="mt-1 inline-flex items-start gap-2 text-xs font-medium text-emerald-700">
                        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{aiNotes[refund.id]}</span>
                      </p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && adminRefunds.length === 0 ? (
            <div className="p-4">
              <AdminEmptyState
                icon={RefreshCcw}
                title="Chua co yeu cau hoan tien"
                description="Khi he thong phat sinh refund, bang nay se hien cac luong can xu ly kem goi y AI cho admin."
                tone="amber"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
