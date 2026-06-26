'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Loader2, AlertCircle, CheckCircle2, Package, CalendarDays, Info } from 'lucide-react';
import { formatVND } from '@lishop/shared';
import { sellerApi } from '@/lib/seller-api';
import { SHOP_STATUS_LABELS, SHOP_STATUS_COLORS } from '../_constants';
import { SellerPageHeader } from '../_components/seller-page-header';
import { SellerMetricCard } from '../_components/seller-metric-card';

export default function ShopPage() {
  const queryClient = useQueryClient();
  const { data: shop, isLoading, error } = useQuery({
    queryKey: ['my-shop'],
    queryFn: () => sellerApi.getMyShop(),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: () => sellerApi.getOrders(),
  });

  const [form, setForm] = useState<{
    name: string;
    description: string;
    phone: string;
    address: string;
  } | null>(null);

  const [editing, setEditing] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; description: string; phone: string; address: string }) =>
      sellerApi.updateShop(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shop'] });
      setEditing(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
        <h2 className="text-lg font-semibold text-slate-900">Không thể tải thông tin</h2>
        <p className="mt-1 text-sm text-slate-500">Bạn chưa có cửa hàng hoặc phiên làm việc đã hết hạn.</p>
      </div>
    );
  }

  const current = form ?? shop;
  const totalRevenue = orders.reduce((s, o) => s + o.totalVnd, 0);
  const badgeColor = SHOP_STATUS_COLORS[shop.status] ?? 'bg-gray-100 text-gray-700';
  const statusLabel = SHOP_STATUS_LABELS[shop.status] ?? shop.status;

  const inputCls = 'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <SellerPageHeader
        icon={Store}
        title={shop.name}
        description="Quản lý thông tin cửa hàng của bạn"
        badge={statusLabel}
        tone="violet"
        stats={[
          { label: 'Sản phẩm', value: `${shop._count.products}` },
          { label: 'Doanh thu', value: formatVND(totalRevenue) },
          { label: 'Ngày tạo', value: new Date(shop.createdAt).toLocaleDateString('vi-VN') },
        ]}
      />

      {updateMutation.isSuccess && (
        <div className="flex items-center gap-2 rounded-[28px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Cập nhật thông tin thành công
        </div>
      )}

      {updateMutation.isError && (
        <div className="flex items-center gap-2 rounded-[28px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Có lỗi xảy ra, vui lòng thử lại
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
              {shop.logoUrl ? (
                <img src={shop.logoUrl} alt={shop.name} className="h-full w-full rounded-2xl object-cover" />
              ) : (
                <Store className="h-8 w-8 text-violet-600" />
              )}
            </div>
            <div>
              <p className="text-xl font-semibold text-slate-950">{shop.name}</p>
              <p className="text-sm text-slate-500">@{shop.slug}</p>
            </div>
            {!editing && (
              <button
                onClick={() => {
                  setForm({ name: shop.name, description: shop.description ?? '', phone: shop.phone ?? '', address: shop.address ?? '' });
                  setEditing(true);
                }}
                className="ml-auto rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700"
              >
                Chỉnh sửa
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tên cửa hàng</label>
              {editing ? (
                <input
                  value={current.name}
                  onChange={(e) => setForm((f) => f ? { ...f, name: e.target.value } : null)}
                  className={`${inputCls} mt-2`}
                />
              ) : (
                <p className="mt-2 text-sm text-slate-900">{shop.name}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Số điện thoại</label>
              {editing ? (
                <input
                  value={current.phone ?? ''}
                  onChange={(e) => setForm((f) => f ? { ...f, phone: e.target.value } : null)}
                  className={`${inputCls} mt-2`}
                />
              ) : (
                <p className="mt-2 text-sm text-slate-900">{shop.phone ?? '—'}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Mô tả</label>
              {editing ? (
                <textarea
                  value={current.description ?? ''}
                  onChange={(e) => setForm((f) => f ? { ...f, description: e.target.value } : null)}
                  rows={3}
                  className={`${inputCls} mt-2 resize-none`}
                />
              ) : (
                <p className="mt-2 text-sm text-slate-900">{shop.description ?? 'Chưa có mô tả'}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Địa chỉ</label>
              {editing ? (
                <input
                  value={current.address ?? ''}
                  onChange={(e) => setForm((f) => f ? { ...f, address: e.target.value } : null)}
                  className={`${inputCls} mt-2`}
                />
              ) : (
                <p className="mt-2 text-sm text-slate-900">{shop.address ?? '—'}</p>
              )}
            </div>
          </div>

          {editing && (
            <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
              <button
                onClick={() => {
                  if (form) updateMutation.mutate(form);
                }}
                disabled={updateMutation.isPending}
                className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <button
                onClick={() => { setEditing(false); setForm(null); }}
                disabled={updateMutation.isPending}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Info className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-slate-950">Thông tin bổ sung</h2>
            </div>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Trạng thái</span>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeColor}`}>
                  {statusLabel}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Số sản phẩm</span>
                <span className="text-sm font-semibold text-slate-900">{shop._count.products}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Ngày tạo</span>
                <span className="text-sm font-semibold text-slate-900">
                  {new Date(shop.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
              {shop.approvedAt && (
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-600">Ngày duyệt</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {new Date(shop.approvedAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Package className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-slate-950">Thống kê</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Sản phẩm</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{shop._count.products}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Đơn hàng</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{orders.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Doanh thu</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{formatVND(totalRevenue)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Ngày tạo</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {new Date(shop.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
