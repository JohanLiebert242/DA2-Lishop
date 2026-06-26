'use client';

import { useQuery } from '@tanstack/react-query';
import { Store, Package, AlertCircle } from 'lucide-react';
import { sellerApi } from '../../../lib/seller-api';

export default function DashboardPage() {
  const { data: shop, isLoading, error } = useQuery({
    queryKey: ['my-shop'],
    queryFn: () => sellerApi.getMyShop(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Đang tải...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
        <h2 className="text-lg font-semibold text-gray-900">Không thể tải thông tin</h2>
        <p className="mt-1 text-sm text-gray-500">Bạn chưa có cửa hàng hoặc phiên làm việc đã hết hạn.</p>
      </div>
    );
  }

  if (!shop) return null;

  const statusBadge: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Chờ duyệt', className: 'bg-amber-100 text-amber-800' },
    APPROVED: { label: 'Đã duyệt', className: 'bg-green-100 text-green-800' },
    REJECTED: { label: 'Từ chối', className: 'bg-red-100 text-red-800' },
  };

  const badge = statusBadge[shop.status] ?? { label: shop.status, className: 'bg-gray-100 text-gray-700' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{shop.name}</h1>
          <p className="text-sm text-gray-500">{shop.description ?? 'Chưa có mô tả'}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {shop.status === 'REJECTED' && shop.rejectionReason ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Lý do từ chối:</strong> {shop.rejectionReason}
        </div>
      ) : null}

      {shop.status === 'PENDING' ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Cửa hàng của bạn đang chờ admin phê duyệt. Bạn sẽ nhận được thông báo khi được duyệt.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
              <Store className="h-5 w-5 text-violet-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Trạng thái</p>
              <p className="text-sm font-semibold text-gray-900">{badge.label}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <Package className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Sản phẩm</p>
              <p className="text-sm font-semibold text-gray-900">{shop._count.products}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Store className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Ngày tạo</p>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(shop.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
