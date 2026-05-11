'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, AdminReturn } from '../../../lib/admin-api';
import {
  RETURN_NEXT_STATUSES,
  RETURN_STATUS_COLORS,
  RETURN_STATUS_LABELS,
  RETURN_REASON_LABELS,
} from '../_constants';

function ReturnRow({ ret }: { ret: AdminReturn }) {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [showUpdate, setShowUpdate] = useState(false);

  const nextStatuses = RETURN_NEXT_STATUSES[ret.status] ?? [];

  const updateMutation = useMutation({
    mutationFn: () =>
      adminApi.updateReturnStatus(ret.id, selectedStatus, adminNote || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-returns'] });
      setShowUpdate(false);
      setSelectedStatus('');
      setAdminNote('');
    },
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
        <td className="px-4 py-3 text-sm text-gray-700">
          {RETURN_REASON_LABELS[ret.reason] ?? ret.reason}
        </td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RETURN_STATUS_COLORS[ret.status] ?? 'bg-gray-100 text-gray-700'}`}>
            {RETURN_STATUS_LABELS[ret.status] ?? ret.status}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {new Date(ret.createdAt).toLocaleDateString('vi-VN')}
        </td>
        <td className="px-4 py-3">
          {nextStatuses.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowUpdate((v) => !v);
                setSelectedStatus(nextStatuses[0] ?? '');
              }}
              className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                showUpdate
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cập nhật
            </button>
          )}
        </td>
      </tr>
      {showUpdate && (
        <tr className="border-b bg-indigo-50">
          <td colSpan={7} className="px-4 py-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor={`return-status-${ret.id}`} className="block text-xs font-medium text-gray-700 mb-1">
                  Trạng thái mới
                </label>
                <select
                  id={`return-status-${ret.id}`}
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  {nextStatuses.map((s) => (
                    <option key={s} value={s}>{RETURN_STATUS_LABELS[s] ?? s}</option>
                  ))}
                </select>
              </div>
              {needsNote && (
                <div className="flex-1 min-w-48">
                  <label htmlFor={`return-note-${ret.id}`} className="block text-xs font-medium text-gray-700 mb-1">
                    Ghi chú admin
                  </label>
                  <input
                    id={`return-note-${ret.id}`}
                    type="text"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateMutation.mutate()}
                  disabled={!selectedStatus || updateMutation.isPending}
                  className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUpdate(false)}
                  className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ReturnsPage() {
  const { data: returns = [], isLoading } = useQuery({
    queryKey: ['admin-returns'],
    queryFn: () => adminApi.getReturns(),
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h2 className="text-sm font-semibold text-gray-900">
          {isLoading ? 'Đang tải...' : `${returns.length} yêu cầu đổi trả`}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Mã yêu cầu</th>
              <th className="px-4 py-2 text-left">Khách hàng</th>
              <th className="px-4 py-2 text-left">Đơn hàng</th>
              <th className="px-4 py-2 text-left">Lý do</th>
              <th className="px-4 py-2 text-left">Trạng thái</th>
              <th className="px-4 py-2 text-left">Ngày tạo</th>
              <th className="px-4 py-2 text-left">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((ret) => <ReturnRow key={ret.id} ret={ret} />)}
          </tbody>
        </table>
        {!isLoading && returns.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có yêu cầu đổi trả.</p>
        )}
      </div>
    </div>
  );
}
