'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PackageSearch, RotateCcw, Sparkles, Truck } from 'lucide-react';
import { adminApi, AdminReturn } from '../../../lib/admin-api';
import {
  RETURN_NEXT_STATUSES,
  RETURN_STATUS_COLORS,
  RETURN_STATUS_LABELS,
  RETURN_REASON_LABELS,
} from '../_constants';
import { AdminEmptyState } from '../_components/admin-empty-state';
import { AdminMetricCard } from '../_components/admin-metric-card';
import { AdminPageHeader } from '../_components/admin-page-header';

function ReturnRow({ ret }: { ret: AdminReturn }) {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [showUpdate, setShowUpdate] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

  const nextStatuses = RETURN_NEXT_STATUSES[ret.status] ?? [];

  const updateMutation = useMutation({
    mutationFn: () => adminApi.updateReturnStatus(ret.id, selectedStatus, adminNote || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-returns'] });
      setShowUpdate(false);
      setSelectedStatus('');
      setAdminNote('');
      setAiSummary('');
    },
  });

  const aiMutation = useMutation({
    mutationFn: () => adminApi.generateReturnAiAssist(ret.id),
    onSuccess: (result) => {
      if (result.adminNote) setAdminNote(result.adminNote);
      if (result.suggestedStatus) setSelectedStatus(result.suggestedStatus);
      setAiSummary(result.fallback ? `AI fallback: ${result.summary}` : result.summary);
    },
    onError: (err: Error) => setAiSummary(err.message),
  });

  const userName =
    ret.user.firstName && ret.user.lastName
      ? `${ret.user.firstName} ${ret.user.lastName}`
      : ret.user.email;

  const needsNote = selectedStatus === 'REJECTED' || selectedStatus === 'COMPLETED';

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-gray-50">
        <td className="px-4 py-3 font-mono text-xs text-gray-600">{ret.id.slice(0, 8)}…</td>
        <td className="px-4 py-3 text-sm text-gray-700">{userName}</td>
        <td className="px-4 py-3 font-mono text-sm text-gray-700">#{ret.order.orderNumber}</td>
        <td className="px-4 py-3 text-sm text-gray-700">{RETURN_REASON_LABELS[ret.reason] ?? ret.reason}</td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RETURN_STATUS_COLORS[ret.status] ?? 'bg-gray-100 text-gray-700'}`}>
            {RETURN_STATUS_LABELS[ret.status] ?? ret.status}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">{new Date(ret.createdAt).toLocaleDateString('vi-VN')}</td>
        <td className="px-4 py-3">
          {nextStatuses.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setShowUpdate((value) => !value);
                setSelectedStatus(nextStatuses[0] ?? '');
              }}
              data-testid={`return-update-${ret.id}`}
              className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                showUpdate
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cap nhat
            </button>
          ) : null}
        </td>
      </tr>
      {showUpdate ? (
        <tr className="border-b bg-indigo-50">
          <td colSpan={7} className="px-4 py-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor={`return-status-${ret.id}`} className="mb-1 block text-xs font-medium text-gray-700">
                  Trang thai moi
                </label>
                <select
                  id={`return-status-${ret.id}`}
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  {nextStatuses.map((status) => (
                    <option key={status} value={status}>{RETURN_STATUS_LABELS[status] ?? status}</option>
                  ))}
                </select>
              </div>
              {needsNote ? (
                <div className="min-w-48 flex-1">
                  <label htmlFor={`return-note-${ret.id}`} className="mb-1 block text-xs font-medium text-gray-700">
                    Ghi chu admin
                  </label>
                  <input
                    id={`return-note-${ret.id}`}
                    type="text"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => aiMutation.mutate()}
                disabled={aiMutation.isPending}
                data-testid={`return-ai-${ret.id}`}
                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              >
                {aiMutation.isPending ? 'AI dang goi y...' : 'AI goi y'}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateMutation.mutate()}
                  disabled={!selectedStatus || updateMutation.isPending}
                  className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Dang luu...' : 'Luu'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUpdate(false)}
                  className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Huy
                </button>
              </div>
            </div>
            {aiSummary ? (
              <p className="mt-2 inline-flex items-start gap-2 text-xs font-medium text-emerald-700">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{aiSummary}</span>
              </p>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}

export default function ReturnsPage() {
  const { data: returns = [], isLoading } = useQuery({
    queryKey: ['admin-returns'],
    queryFn: () => adminApi.getReturns(),
  });

  const pendingReturns = returns.filter((ret) => ret.status === 'PENDING').length;
  const approvedReturns = returns.filter((ret) => ret.status === 'APPROVED').length;
  const receivedReturns = returns.filter((ret) => ret.status === 'RECEIVED').length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={RotateCcw}
        title="Doi tra"
        description="Theo doi luong return request, trang thai tiep nhan, nhan hang va hoan tat, dong thoi nhan goi y AI cho cap nhat admin note."
        badge="After-sales"
        tone="rose"
        stats={[
          { label: 'Tong yeu cau', value: isLoading ? '...' : `${returns.length}` },
          { label: 'Cho xu ly', value: isLoading ? '...' : `${pendingReturns}` },
          { label: 'Da duyet', value: isLoading ? '...' : `${approvedReturns}` },
          { label: 'Da nhan hang', value: isLoading ? '...' : `${receivedReturns}` },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard icon={PackageSearch} label="Pending" value={isLoading ? '...' : `${pendingReturns}`} hint="Yeu cau can xem xet" tone="amber" />
        <AdminMetricCard icon={Truck} label="Received" value={isLoading ? '...' : `${receivedReturns}`} hint="Hang doi tra da ve kho" tone="sky" />
        <AdminMetricCard icon={RotateCcw} label="Approved" value={isLoading ? '...' : `${approvedReturns}`} hint="Case co the di tiep sang buoc sau" tone="rose" />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            {isLoading ? 'Dang tai...' : `${returns.length} yeu cau doi tra`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Ma yeu cau</th>
                <th className="px-4 py-2 text-left">Khach hang</th>
                <th className="px-4 py-2 text-left">Don hang</th>
                <th className="px-4 py-2 text-left">Ly do</th>
                <th className="px-4 py-2 text-left">Trang thai</th>
                <th className="px-4 py-2 text-left">Ngay tao</th>
                <th className="px-4 py-2 text-left">Thao tac</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((ret) => <ReturnRow key={ret.id} ret={ret} />)}
            </tbody>
          </table>
          {!isLoading && returns.length === 0 ? (
            <div className="p-4">
              <AdminEmptyState
                icon={RotateCcw}
                title="Chua co yeu cau doi tra"
                description="Khi khach hang tao return request, admin se thay queue thao tac, trang thai va AI suggestion trong bang nay."
                tone="rose"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
