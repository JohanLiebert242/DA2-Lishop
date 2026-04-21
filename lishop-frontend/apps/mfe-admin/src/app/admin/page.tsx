'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatVND } from '@lishop/shared';
import {
  adminApi, OrderStatus, AdminOrderItem, AdminCoupon, CouponType, CreateCouponInput,
  ProductStock, AdminReturn,
} from '../../lib/admin-api';

// ─── Constants ───────────────────────────────────────────────────────────────

type Tab = 'orders' | 'users' | 'promotions' | 'analytics' | 'inventory' | 'returns';

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED',
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
};

const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  PERCENT: 'Phần trăm (%)',
  FIXED: 'Cố định (₫)',
  FREE_SHIPPING: 'Miễn phí vận chuyển',
};

const TAB_LABELS: Record<Tab, string> = {
  orders: 'Đơn hàng',
  users: 'Người dùng',
  promotions: 'Khuyến mãi',
  analytics: 'Phân tích',
  inventory: 'Kho hàng',
  returns: 'Đổi trả',
};

const RETURN_REASON_LABELS: Record<string, string> = {
  DAMAGED: 'Hàng bị hỏng',
  WRONG_ITEM: 'Sai sản phẩm',
  NOT_AS_DESCRIBED: 'Không đúng mô tả',
  CHANGED_MIND: 'Đổi ý',
  OTHER: 'Khác',
};

const RETURN_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  RECEIVED: 'bg-violet-100 text-violet-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
};

const RETURN_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  RECEIVED: 'Đã nhận hàng',
  COMPLETED: 'Hoàn tất',
};

// Next allowed statuses for returns
const RETURN_NEXT_STATUSES: Record<string, string[]> = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['RECEIVED'],
  RECEIVED: ['COMPLETED'],
  REJECTED: [],
  COMPLETED: [],
};

// ─── Components ──────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function OrderRow({ order }: { order: AdminOrderItem }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<OrderStatus>(order.status);

  const mutation = useMutation({
    mutationFn: (s: OrderStatus) => adminApi.updateOrderStatus(order.id, s),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const userName =
    order.user.firstName && order.user.lastName
      ? `${order.user.firstName} ${order.user.lastName}`
      : order.user.email;

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3 font-mono text-sm text-gray-700">#{order.orderNumber}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{userName}</td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatVND(order.totalVnd)}</td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {new Date(order.createdAt).toLocaleDateString('vi-VN')}
      </td>
      <td className="px-4 py-3">
        <select
          value={status}
          onChange={(e) => {
            const s = e.target.value as OrderStatus;
            setStatus(s);
            mutation.mutate(s);
          }}
          disabled={mutation.isPending}
          className={`cursor-pointer rounded-full border-0 px-2 py-1 text-xs font-medium disabled:opacity-50 ${STATUS_COLORS[status]}`}
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">{order.itemCount} sp</td>
    </tr>
  );
}

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

function InventoryRow({
  product,
  isAdjusting,
  onAdjustClick,
}: {
  product: ProductStock;
  isAdjusting: boolean;
  onAdjustClick: () => void;
}) {
  return (
    <tr className="border-b last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900">{product.name}</p>
        <p className="text-xs text-gray-400">{product.slug}</p>
      </td>
      <td className="px-4 py-3 text-sm">
        {product.isLowStock ? (
          <span className="font-semibold text-red-600">
            {product.stock}{' '}
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-700">⚠ Sắp hết</span>
          </span>
        ) : (
          <span className="font-medium text-gray-900">{product.stock}</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{product.weightGrams}g</td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {product.lastMovement ? (
          <span>
            {product.lastMovement.type}{' '}
            <span className={product.lastMovement.delta >= 0 ? 'text-green-600' : 'text-red-600'}>
              {product.lastMovement.delta >= 0 ? '+' : ''}{product.lastMovement.delta}
            </span>
            {' · '}{new Date(product.lastMovement.createdAt).toLocaleDateString('vi-VN')}
          </span>
        ) : '—'}
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={onAdjustClick}
          className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
            isAdjusting
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Điều chỉnh
        </button>
      </td>
    </tr>
  );
}

function AdjustStockForm({
  product,
  onClose,
}: {
  product: ProductStock;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [delta, setDelta] = useState(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const adjustMutation = useMutation({
    mutationFn: () => adminApi.adjustStock(product.id, delta, note || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <tr className="border-b bg-indigo-50">
      <td colSpan={5} className="px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor={`delta-${product.id}`} className="block text-xs font-medium text-gray-700 mb-1">
              Điều chỉnh tồn kho (+ thêm, - bớt)
            </label>
            <input
              id={`delta-${product.id}`}
              type="number"
              value={delta}
              onChange={(e) => setDelta(Number(e.target.value))}
              className="w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex-1 min-w-40">
            <label htmlFor={`note-${product.id}`} className="block text-xs font-medium text-gray-700 mb-1">
              Ghi chú (không bắt buộc)
            </label>
            <textarea
              id={`note-${product.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={1}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => adjustMutation.mutate()}
              disabled={delta === 0 || adjustMutation.isPending}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {adjustMutation.isPending ? 'Đang lưu...' : 'Lưu'}
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
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </td>
    </tr>
  );
}

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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>('orders');
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);
  const [adjustingProductId, setAdjustingProductId] = useState<string | null>(null);

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => adminApi.listOrders(),
    enabled: tab === 'orders',
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers(),
    enabled: tab === 'users',
  });

  const { data: coupons = [], isLoading: couponsLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => adminApi.listCoupons(),
    enabled: tab === 'promotions',
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.getAnalytics(),
    enabled: tab === 'analytics',
  });

  const { data: inventory = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: () => adminApi.getInventory(),
    enabled: tab === 'inventory',
  });

  const { data: returns = [], isLoading: returnsLoading } = useQuery({
    queryKey: ['admin-returns'],
    queryFn: () => adminApi.getReturns(),
    enabled: tab === 'returns',
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Bảng điều khiển</h1>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Đơn hàng" value={stats?.orderCount ?? '—'} />
        <StatCard label="Doanh thu" value={stats ? formatVND(stats.revenueVnd) : '—'} />
        <StatCard label="Người dùng" value={stats?.userCount ?? '—'} />
        <StatCard label="Sản phẩm" value={stats?.productCount ?? '—'} />
      </div>

      {/* Tabs */}
      <div role="tablist" className="mb-4 flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => { setTab(t); setShowCreateCoupon(false); setAdjustingProductId(null); }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Orders tab */}
      {tab === 'orders' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="text-sm font-semibold text-gray-900">
              {ordersLoading ? 'Đang tải...' : `${orders.length} đơn hàng gần nhất`}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Mã đơn</th>
                  <th className="px-4 py-2 text-left">Khách hàng</th>
                  <th className="px-4 py-2 text-left">Tổng tiền</th>
                  <th className="px-4 py-2 text-left">Ngày đặt</th>
                  <th className="px-4 py-2 text-left">Trạng thái</th>
                  <th className="px-4 py-2 text-left">SL</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => <OrderRow key={order.id} order={order} />)}
              </tbody>
            </table>
            {!ordersLoading && orders.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có đơn hàng.</p>
            )}
          </div>
        </div>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="text-sm font-semibold text-gray-900">
              {usersLoading ? 'Đang tải...' : `${users.length} người dùng`}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Họ tên</th>
                  <th className="px-4 py-2 text-left">Vai trò</th>
                  <th className="px-4 py-2 text-left">Điểm tích lũy</th>
                  <th className="px-4 py-2 text-left">Ngày tham gia</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role === 'ADMIN' ? 'Admin' : 'Khách hàng'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{user.loyaltyPoints}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!usersLoading && users.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có người dùng.</p>
            )}
          </div>
        </div>
      )}

      {/* Promotions tab */}
      {tab === 'promotions' && (
        <div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-sm font-semibold text-gray-900">
                {couponsLoading ? 'Đang tải...' : `${coupons.length} mã giảm giá`}
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
              {!couponsLoading && coupons.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có mã giảm giá.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Analytics tab */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          {/* Revenue chart */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Doanh thu 30 ngày gần nhất</h2>
            {analyticsLoading ? (
              <p className="py-8 text-center text-sm text-gray-400">Đang tải...</p>
            ) : !analytics || analytics.dailyRevenue.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Chưa có dữ liệu doanh thu.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.dailyRevenue} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(d: unknown) => String(d).slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v: unknown) => `${(Number(v) / 1_000_000).toFixed(1)}tr`}
                    width={50}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [formatVND(Number(value)), 'Doanh thu']}
                    labelFormatter={(label: unknown) => `Ngày ${String(label)}`}
                  />
                  <Bar dataKey="amount" fill="#6366f1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top products */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b">
              <h2 className="text-sm font-semibold text-gray-900">Top 5 sản phẩm theo doanh thu</h2>
            </div>
            {analyticsLoading ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Đang tải...</p>
            ) : !analytics || analytics.topProducts.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có dữ liệu.</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Sản phẩm</th>
                    <th className="px-4 py-2 text-right">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topProducts.map((p, i) => (
                    <tr key={p.productId} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{p.productName}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {formatVND(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Inventory tab */}
      {tab === 'inventory' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="text-sm font-semibold text-gray-900">
              {inventoryLoading ? 'Đang tải...' : `${inventory.length} sản phẩm`}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Sản phẩm</th>
                  <th className="px-4 py-2 text-left">Tồn kho</th>
                  <th className="px-4 py-2 text-left">Cân nặng</th>
                  <th className="px-4 py-2 text-left">Lần cập nhật cuối</th>
                  <th className="px-4 py-2 text-left">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((product) => (
                  <>
                    <InventoryRow
                      key={product.id}
                      product={product}
                      isAdjusting={adjustingProductId === product.id}
                      onAdjustClick={() =>
                        setAdjustingProductId((prev) =>
                          prev === product.id ? null : product.id
                        )
                      }
                    />
                    {adjustingProductId === product.id && (
                      <AdjustStockForm
                        key={`adjust-${product.id}`}
                        product={product}
                        onClose={() => setAdjustingProductId(null)}
                      />
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {!inventoryLoading && inventory.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có sản phẩm.</p>
            )}
          </div>
        </div>
      )}

      {/* Returns tab */}
      {tab === 'returns' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="text-sm font-semibold text-gray-900">
              {returnsLoading ? 'Đang tải...' : `${returns.length} yêu cầu đổi trả`}
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
                {returns.map((ret) => (
                  <ReturnRow key={ret.id} ret={ret} />
                ))}
              </tbody>
            </table>
            {!returnsLoading && returns.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có yêu cầu đổi trả.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
