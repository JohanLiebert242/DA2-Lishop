'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatVND } from '@lishop/shared';
import { adminApi, AdminCoupon, CouponType, CreateCouponInput } from '../../../lib/admin-api';
import { COUPON_TYPE_LABELS } from '../_constants';

function CouponRow({ coupon }: { coupon: AdminCoupon }) {
  const queryClient = useQueryClient();
  const toggleMutation = useMutation({
    mutationFn: () => adminApi.toggleCoupon(coupon.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }),
  });

  const valueLabel =
    coupon.type === 'PERCENT'
      ? `${coupon.value}%`
      : coupon.type === 'FIXED'
      ? formatVND(coupon.value)
      : 'Miễn phí ship';

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-900">{coupon.code}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{COUPON_TYPE_LABELS[coupon.type]}</td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{valueLabel}</td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {coupon.usedCount}{coupon.maxUses ? `/${coupon.maxUses}` : ''}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('vi-VN') : '—'}
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => toggleMutation.mutate()}
          disabled={toggleMutation.isPending}
          aria-pressed={coupon.isActive}
          aria-label={`${coupon.isActive ? 'Tắt' : 'Bật'} mã ${coupon.code}`}
          className={`rounded-full px-2 py-0.5 text-xs font-medium disabled:opacity-50 ${
            coupon.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {coupon.isActive ? 'Đang dùng' : 'Tắt'}
        </button>
      </td>
    </tr>
  );
}

function CreateCouponForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateCouponInput>({ code: '', type: 'PERCENT', value: 0 });
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: CreateCouponInput) => adminApi.createCoupon(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Tạo mã giảm giá mới</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="coupon-code" className="block text-xs font-medium text-gray-700 mb-1">Mã</label>
          <input
            id="coupon-code"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="VD: SUMMER10"
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="coupon-type" className="block text-xs font-medium text-gray-700 mb-1">Loại</label>
          <select
            id="coupon-type"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CouponType }))}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          >
            {(Object.keys(COUPON_TYPE_LABELS) as CouponType[]).map((t) => (
              <option key={t} value={t}>{COUPON_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="coupon-value" className="block text-xs font-medium text-gray-700 mb-1">
            Giá trị {form.type === 'PERCENT' ? '(%)' : form.type === 'FIXED' ? '(₫)' : ''}
          </label>
          <input
            id="coupon-value"
            type="number"
            min={0}
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
            disabled={form.type === 'FREE_SHIPPING'}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-100"
          />
        </div>
        <div>
          <label htmlFor="coupon-max-uses" className="block text-xs font-medium text-gray-700 mb-1">Số lần tối đa</label>
          <input
            id="coupon-max-uses"
            type="number"
            min={1}
            placeholder="Không giới hạn"
            value={form.maxUses ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value ? Number(e.target.value) : undefined }))}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="coupon-min-order" className="block text-xs font-medium text-gray-700 mb-1">Đơn hàng tối thiểu (₫)</label>
          <input
            id="coupon-min-order"
            type="number"
            min={0}
            placeholder="Không yêu cầu"
            value={form.minOrderVnd ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, minOrderVnd: e.target.value ? Number(e.target.value) : undefined }))}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="coupon-expires" className="block text-xs font-medium text-gray-700 mb-1">Hết hạn</label>
          <input
            id="coupon-expires"
            type="date"
            value={form.expiresAt?.slice(0, 10) ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => createMutation.mutate(form)}
          disabled={!form.code || createMutation.isPending}
          className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {createMutation.isPending ? 'Đang tạo...' : 'Tạo mã'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}

export default function PromotionsPage() {
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => adminApi.listCoupons(),
  });

  return (
    <div>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold text-gray-900">
            {isLoading ? 'Đang tải...' : `${coupons.length} mã giảm giá`}
          </h2>
          <button
            type="button"
            onClick={() => setShowCreateCoupon((v) => !v)}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            + Tạo mã
          </button>
        </div>
        {showCreateCoupon && (
          <div className="border-b px-4 pb-4">
            <CreateCouponForm onClose={() => setShowCreateCoupon(false)} />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Mã</th>
                <th className="px-4 py-2 text-left">Loại</th>
                <th className="px-4 py-2 text-left">Giá trị</th>
                <th className="px-4 py-2 text-left">Đã dùng</th>
                <th className="px-4 py-2 text-left">Hết hạn</th>
                <th className="px-4 py-2 text-left">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => <CouponRow key={coupon.id} coupon={coupon} />)}
            </tbody>
          </table>
          {!isLoading && coupons.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có mã giảm giá.</p>
          )}
        </div>
      </div>
    </div>
  );
}
