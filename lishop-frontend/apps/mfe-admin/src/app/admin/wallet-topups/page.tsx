'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatVND } from '@lishop/shared';
import { adminApi, AdminWalletTopup, WalletTopupStatus } from '../../../lib/admin-api';

const STATUS_LABELS: Record<WalletTopupStatus, string> = {
  PENDING: 'Chờ chuyển khoản',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Đã từ chối',
};

const STATUS_COLORS: Record<WalletTopupStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getCustomerName(topup: AdminWalletTopup) {
  const fullName = `${topup.user.firstName ?? ''} ${topup.user.lastName ?? ''}`.trim();
  return fullName || topup.user.email;
}

export default function WalletTopupsPage() {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: topups = [], isLoading } = useQuery({
    queryKey: ['admin-wallet-topups'],
    queryFn: () => adminApi.getWalletTopups(),
  });

  const counters = useMemo(() => {
    return topups.reduce(
      (acc, topup) => {
        acc[topup.status] += 1;
        return acc;
      },
      { PENDING: 0, APPROVED: 0, REJECTED: 0 } as Record<WalletTopupStatus, number>,
    );
  }, [topups]);

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const adminNote = notes[id]?.trim() || undefined;
      return action === 'approve'
        ? adminApi.approveWalletTopup(id, adminNote)
        : adminApi.rejectWalletTopup(id, adminNote);
    },
    onSuccess: (_, variables) => {
      setNotes((current) => {
        const next = { ...current };
        delete next[variables.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['admin-wallet-topups'] });
      queryClient.invalidateQueries({ queryKey: ['admin-wallets'] });
      toast.success(variables.action === 'approve' ? 'Đã duyệt yêu cầu nạp ví' : 'Đã từ chối yêu cầu nạp ví');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-medium uppercase text-amber-700">Chờ đối soát</p>
          <p className="mt-1 text-2xl font-semibold text-amber-900">{counters.PENDING}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-medium uppercase text-emerald-700">Đã cộng ví</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-900">{counters.APPROVED}</p>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-xs font-medium uppercase text-rose-700">Đã từ chối</p>
          <p className="mt-1 text-2xl font-semibold text-rose-900">{counters.REJECTED}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {isLoading ? 'Đang tải...' : `${topups.length} yêu cầu nạp ví`}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Chỉ duyệt khi đã nhận đúng số tiền và nội dung chuyển khoản.
            </p>
          </div>
          {reviewMutation.isError && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              Không thể cập nhật yêu cầu. Vui lòng thử lại.
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px]">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Mã chuyển khoản</th>
                <th className="px-4 py-2 text-left">Khách hàng</th>
                <th className="px-4 py-2 text-left">Số tiền</th>
                <th className="px-4 py-2 text-left">Tài khoản nhận</th>
                <th className="px-4 py-2 text-left">Trạng thái</th>
                <th className="px-4 py-2 text-left">Thời gian</th>
                <th className="px-4 py-2 text-left">Ghi chú / thao tác</th>
              </tr>
            </thead>
            <tbody>
              {topups.map((topup) => {
                const isPending = topup.status === 'PENDING';
                const isUpdating = reviewMutation.isPending;

                return (
                  <tr key={topup.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 align-top">
                      <p className="font-mono text-sm font-semibold text-gray-900">{topup.transferCode}</p>
                      <p className="mt-1 text-xs text-gray-500">ID: {topup.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm font-medium text-gray-900">{getCustomerName(topup)}</p>
                      <p className="mt-1 text-xs text-gray-500">{topup.user.email}</p>
                    </td>
                    <td className="px-4 py-3 align-top text-sm font-semibold text-gray-900">
                      {formatVND(topup.amountVnd)}
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-gray-700">
                      <p className="font-medium text-gray-900">{topup.bankName}</p>
                      <p className="font-mono">{topup.bankAccountNumber}</p>
                      <p className="text-xs text-gray-500">{topup.bankAccountName}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[topup.status]}`}>
                        {STATUS_LABELS[topup.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-500">
                      <p>Tạo: {formatDate(topup.createdAt)}</p>
                      <p className="mt-1">Duyệt: {formatDate(topup.reviewedAt)}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {isPending ? (
                        <div className="w-64 space-y-2">
                          <textarea
                            value={notes[topup.id] ?? ''}
                            onChange={(event) => setNotes((current) => ({ ...current, [topup.id]: event.target.value }))}
                            rows={2}
                            maxLength={240}
                            placeholder="Ghi chú đối soát..."
                            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => reviewMutation.mutate({ id: topup.id, action: 'approve' })}
                              disabled={isUpdating}
                              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Duyệt
                            </button>
                            <button
                              type="button"
                              onClick={() => reviewMutation.mutate({ id: topup.id, action: 'reject' })}
                              disabled={isUpdating}
                              className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                            >
                              Từ chối
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="max-w-xs text-sm text-gray-600">{topup.adminNote || '—'}</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!isLoading && topups.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-gray-400">
              Chưa có yêu cầu nạp ví nào.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
