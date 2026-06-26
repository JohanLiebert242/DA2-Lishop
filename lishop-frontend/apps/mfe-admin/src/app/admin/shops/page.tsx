'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi, AdminShop } from '../../../lib/admin-api';
import { AdminPageHeader } from '../_components/admin-page-header';
import { AdminEmptyState } from '../_components/admin-empty-state';

const STATUS_TABS = [
  { label: 'Tất cả', value: '' },
  { label: 'Chờ duyệt', value: 'PENDING' },
  { label: 'Đã duyệt', value: 'APPROVED' },
  { label: 'Từ chối', value: 'REJECTED' },
] as const;

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Chờ duyệt', className: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: 'Đã duyệt', className: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Từ chối', className: 'bg-red-100 text-red-800' },
};

export default function ShopsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ['admin-shops', statusFilter],
    queryFn: () => adminApi.listShops(statusFilter || undefined),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveShop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shops'] });
      toast.success('Đã duyệt cửa hàng');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.rejectShop(id, reason || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shops'] });
      setRejectModal(null);
      setRejectReason('');
      toast.success('Đã từ chối cửa hàng');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Store}
        title="Cửa hàng"
        description="Quản lý cửa hàng của người bán trên Lishop. Duyệt hoặc từ chối yêu cầu đăng ký mở cửa hàng mới."
        badge="Người bán"
        tone="violet"
      />

      <div className="flex gap-2 border-b pb-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-violet-100 text-violet-800'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Tên cửa hàng</th>
                <th className="px-4 py-3 text-left">Chủ shop</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-left">Sản phẩm</th>
                <th className="px-4 py-3 text-left">Ngày tạo</th>
                <th className="px-4 py-3 text-left">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {shops.map((shop) => (
                <tr key={shop.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{shop.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {shop.user.firstName} {shop.user.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{shop.user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[shop.status]?.className ?? ''}`}>
                      {STATUS_BADGE[shop.status]?.label ?? shop.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{shop._count.products}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(shop.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    {shop.status === 'PENDING' ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => approveMutation.mutate(shop.id)}
                          disabled={approveMutation.isPending}
                          className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectModal({ id: shop.id, name: shop.name })}
                          className="rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && shops.length === 0 ? (
            <div className="p-4">
              <AdminEmptyState
                icon={Store}
                title="Chưa có cửa hàng nào"
                description="Khi người dùng đăng ký mở cửa hàng, danh sách sẽ hiện ở đây để admin phê duyệt."
                tone="violet"
              />
            </div>
          ) : null}
        </div>
      </div>

      {rejectModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-base font-semibold text-gray-900">Từ chối cửa hàng</h3>
            <p className="mb-4 text-sm text-gray-600">
              Bạn có chắc muốn từ chối cửa hàng <strong>{rejectModal.name}</strong>?
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
              placeholder="Lý do từ chối (không bắt buộc)..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => rejectMutation.mutate({ id: rejectModal.id, reason: rejectReason })}
                disabled={rejectMutation.isPending}
                className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Đang xử lý...' : 'Từ chối'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
