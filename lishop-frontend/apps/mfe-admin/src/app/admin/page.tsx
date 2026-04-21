'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatVND } from '@lishop/shared';
import {
  adminApi, OrderStatus, AdminOrderItem, AdminCoupon, CouponType, CreateCouponInput,
  ProductStock, AdminReturn, AdminTicket, TicketStatus, FAQ,
  AdminProduct, AdminCategory, CreateProductInput,
  AdminReview, ReviewStatus, AdminFlashSale, FlashSaleItem,
} from '../../lib/admin-api';

// ─── Constants ───────────────────────────────────────────────────────────────

type Tab = 'orders' | 'users' | 'promotions' | 'analytics' | 'inventory' | 'returns' | 'tickets' | 'faq' | 'products' | 'reviews' | 'flashsales';

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
  products: 'Sản phẩm',
  promotions: 'Khuyến mãi',
  analytics: 'Phân tích',
  inventory: 'Kho hàng',
  returns: 'Đổi trả',
  tickets: 'Hỗ trợ',
  faq: 'FAQ',
  reviews: 'Đánh giá',
  flashsales: 'Flash Sale',
};

const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const REVIEW_STATUSES: ReviewStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  OPEN: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-gray-100 text-gray-700',
};

const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Mở',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã giải quyết',
  CLOSED: 'Đã đóng',
};

const TICKET_STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const TICKET_CATEGORY_LABELS: Record<string, string> = {
  ORDER: 'Đơn hàng',
  PRODUCT: 'Sản phẩm',
  SHIPPING: 'Vận chuyển',
  PAYMENT: 'Thanh toán',
  RETURN: 'Đổi trả',
  OTHER: 'Khác',
};

const FAQ_CATEGORIES = ['ORDER', 'PRODUCT', 'SHIPPING', 'PAYMENT', 'RETURN', 'OTHER'];

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

function TicketRow({ ticket }: { ticket: AdminTicket }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');

  const statusMutation = useMutation({
    mutationFn: (s: TicketStatus) => adminApi.updateTicketStatus(ticket.id, s),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tickets'] }),
  });

  const replyMutation = useMutation({
    mutationFn: () => adminApi.addTicketMessage(ticket.id, replyText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      setShowReply(false);
      setReplyText('');
    },
  });

  const lastMessage = ticket.messages[ticket.messages.length - 1];

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-gray-50">
        <td className="px-4 py-3 font-mono text-xs text-gray-500">{ticket.id.slice(0, 8)}…</td>
        <td className="px-4 py-3 text-sm text-gray-700">{ticket.user.email}</td>
        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{ticket.subject}</td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category}
        </td>
        <td className="px-4 py-3">
          <select
            value={status}
            onChange={(e) => {
              const s = e.target.value as TicketStatus;
              setStatus(s);
              statusMutation.mutate(s);
            }}
            disabled={statusMutation.isPending}
            className={`cursor-pointer rounded-full border-0 px-2 py-1 text-xs font-medium disabled:opacity-50 ${TICKET_STATUS_COLORS[status]}`}
          >
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>{TICKET_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {new Date(ticket.createdAt).toLocaleDateString('vi-VN')}
        </td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => setShowReply((v) => !v)}
            className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
              showReply
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Phản hồi
          </button>
        </td>
      </tr>
      {showReply && (
        <tr className="border-b bg-indigo-50">
          <td colSpan={7} className="px-4 py-3">
            {lastMessage && (
              <div className="mb-3 rounded-md border border-gray-200 bg-white p-3">
                <p className="mb-1 text-xs font-medium text-gray-500">
                  Tin nhắn cuối ({lastMessage.isAdmin ? 'Admin' : 'Khách'}
                  {' · '}{new Date(lastMessage.createdAt).toLocaleDateString('vi-VN')}):
                </p>
                <p className="text-sm text-gray-700 line-clamp-3">{lastMessage.content}</p>
              </div>
            )}
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Nhập phản hồi..."
              rows={3}
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => replyMutation.mutate()}
                disabled={!replyText.trim() || replyMutation.isPending}
                className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {replyMutation.isPending ? 'Đang gửi...' : 'Gửi'}
              </button>
              <button
                type="button"
                onClick={() => { setShowReply(false); setReplyText(''); }}
                className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

interface FaqModalProps {
  existing?: FAQ;
  onClose: () => void;
  onSaved: () => void;
}

function FaqModal({ existing, onClose, onSaved }: FaqModalProps) {
  const [question, setQuestion] = useState(existing?.question ?? '');
  const [answer, setAnswer] = useState(existing?.answer ?? '');
  const [category, setCategory] = useState(existing?.category ?? 'OTHER');
  const [sortOrder, setSortOrder] = useState(existing?.sortOrder ?? 0);
  const [isPublished, setIsPublished] = useState(existing?.isPublished ?? false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      existing
        ? adminApi.updateFaq(existing.id, { question, answer, category, sortOrder, isPublished })
        : adminApi.createFaq({ question, answer, category, sortOrder, isPublished }),
    onSuccess: () => { onSaved(); onClose(); },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          {existing ? 'Chỉnh sửa FAQ' : 'Thêm FAQ mới'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Câu hỏi</label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Nhập câu hỏi..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Câu trả lời</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Nhập câu trả lời..."
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Danh mục</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {FAQ_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{TICKET_CATEGORY_LABELS[c] ?? c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Thứ tự</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col justify-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
                Đã đăng
              </label>
            </div>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!question.trim() || !answer.trim() || mutation.isPending}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Đang lưu...' : existing ? 'Cập nhật' : 'Tạo'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ProductModalProps {
  existing?: AdminProduct;
  categories: AdminCategory[];
  onClose: () => void;
  onSaved: () => void;
}

function ProductModal({ existing, categories, onClose, onSaved }: ProductModalProps) {
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [priceVnd, setPriceVnd] = useState(existing?.priceVnd ?? 0);
  const [priceUsd, setPriceUsd] = useState(existing?.priceUsd ?? 0);
  const [stock, setStock] = useState(existing?.stock ?? 0);
  const [weightGrams, setWeightGrams] = useState(existing?.weightGrams ?? 500);
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? (categories[0]?.id ?? ''));
  const [imageUrl, setImageUrl] = useState(existing?.images.find((i) => i.isPrimary)?.url ?? '');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const data: CreateProductInput = {
        name, description, priceVnd, priceUsd, stock, weightGrams, categoryId,
        ...(imageUrl ? { images: [{ url: imageUrl, isPrimary: true }] } : {}),
      };
      return existing
        ? adminApi.updateProduct(existing.id, data)
        : adminApi.createProduct(data);
    },
    onSuccess: () => { onSaved(); onClose(); },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          {existing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tên sản phẩm</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Tên sản phẩm..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Mô tả sản phẩm..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Giá (VND)</label>
              <input
                type="number" min={0} value={priceVnd}
                onChange={(e) => setPriceVnd(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Giá (USD cents)</label>
              <input
                type="number" min={0} value={priceUsd}
                onChange={(e) => setPriceUsd(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tồn kho</label>
              <input
                type="number" min={0} value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Trọng lượng (g)</label>
              <input
                type="number" min={1} value={weightGrams}
                onChange={(e) => setWeightGrams(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Danh mục</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">URL hình ảnh chính (không bắt buộc)</label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="https://..."
            />
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button" onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || !description.trim() || !categoryId || mutation.isPending}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Đang lưu...' : existing ? 'Cập nhật' : 'Tạo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ReviewRow ────────────────────────────────────────────────────────────────

function ReviewRow({ review }: { review: AdminReview }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (status: ReviewStatus) => adminApi.moderateReview(review.id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reviews'] }),
  });

  const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
  const userName =
    review.user.firstName && review.user.lastName
      ? `${review.user.firstName} ${review.user.lastName}`
      : review.user.email;

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-900 max-w-[140px] truncate">{review.product.name}</td>
      <td className="px-4 py-3 text-sm text-gray-700 max-w-[120px] truncate">{userName}</td>
      <td className="px-4 py-3 text-sm text-amber-500 tracking-tight">{stars}</td>
      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
        <p className="line-clamp-2">{review.content}</p>
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${REVIEW_STATUS_COLORS[review.status]}`}>
          {REVIEW_STATUS_LABELS[review.status]}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {new Date(review.createdAt).toLocaleDateString('vi-VN')}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {review.status !== 'APPROVED' && (
            <button
              type="button"
              onClick={() => mutation.mutate('APPROVED')}
              disabled={mutation.isPending}
              className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-200 disabled:opacity-50"
            >
              Duyệt
            </button>
          )}
          {review.status !== 'REJECTED' && (
            <button
              type="button"
              onClick={() => mutation.mutate('REJECTED')}
              disabled={mutation.isPending}
              className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-200 disabled:opacity-50"
            >
              Từ chối
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── FlashSaleModal ───────────────────────────────────────────────────────────

interface FlashSaleModalProps {
  existing?: AdminFlashSale;
  onClose: () => void;
  onSaved: () => void;
}

function FlashSaleModal({ existing, onClose, onSaved }: FlashSaleModalProps) {
  const toLocal = (iso: string) => iso ? iso.slice(0, 16) : '';
  const [startAt, setStartAt] = useState(toLocal(existing?.startAt ?? ''));
  const [endAt, setEndAt] = useState(toLocal(existing?.endAt ?? ''));
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const data = { startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString(), isActive };
      return existing
        ? adminApi.updateFlashSale(existing.id, data)
        : adminApi.createFlashSale(data);
    },
    onSuccess: () => { onSaved(); onClose(); },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          {existing ? 'Chỉnh sửa Flash Sale' : 'Tạo Flash Sale mới'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Bắt đầu</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Kết thúc</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600"
            />
            Kích hoạt ngay
          </label>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button" onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!startAt || !endAt || mutation.isPending}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Đang lưu...' : existing ? 'Cập nhật' : 'Tạo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FlashSaleItemsPanel ──────────────────────────────────────────────────────

function FlashSaleItemsPanel({ sale }: { sale: AdminFlashSale }) {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState('');
  const [discountPercent, setDiscountPercent] = useState(10);
  const [addError, setAddError] = useState('');

  const addMutation = useMutation({
    mutationFn: () => adminApi.addFlashSaleItem(sale.id, productId.trim(), discountPercent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flash-sales'] });
      setProductId('');
      setDiscountPercent(10);
      setAddError('');
    },
    onError: (err: Error) => setAddError(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => adminApi.removeFlashSaleItem(sale.id, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-flash-sales'] }),
  });

  return (
    <tr className="border-b bg-indigo-50">
      <td colSpan={6} className="px-6 py-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
          Sản phẩm trong Flash Sale
        </p>
        {sale.items.length === 0 ? (
          <p className="mb-3 text-xs text-gray-500">Chưa có sản phẩm nào.</p>
        ) : (
          <table className="mb-3 w-full rounded-md overflow-hidden text-xs">
            <thead className="bg-indigo-100 text-indigo-800">
              <tr>
                <th className="px-3 py-1.5 text-left">Sản phẩm</th>
                <th className="px-3 py-1.5 text-left">Giá gốc</th>
                <th className="px-3 py-1.5 text-left">Giảm giá</th>
                <th className="px-3 py-1.5 text-left"></th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {sale.items.map((item: FlashSaleItem) => (
                <tr key={item.id} className="border-t border-indigo-100">
                  <td className="px-3 py-1.5 text-gray-900">{item.product.name}</td>
                  <td className="px-3 py-1.5 text-gray-600">{(item.product.priceVnd / 1000).toFixed(0)}k</td>
                  <td className="px-3 py-1.5">
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 font-medium text-orange-800">
                      -{item.discountPercent}%
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => removeMutation.mutate(item.id)}
                      disabled={removeMutation.isPending}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Product ID (UUID)</label>
            <input
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-..."
              className="w-64 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Giảm giá (%)</label>
            <input
              type="number" min={1} max={99} value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
              className="w-20 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => addMutation.mutate()}
            disabled={!productId.trim() || addMutation.isPending}
            className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {addMutation.isPending ? 'Đang thêm...' : '+ Thêm sản phẩm'}
          </button>
        </div>
        {addError && <p className="mt-1 text-xs text-red-600">{addError}</p>}
      </td>
    </tr>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>('orders');
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);
  const [adjustingProductId, setAdjustingProductId] = useState<string | null>(null);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('');
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [deletingFaqId, setDeletingFaqId] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>('');
  const [showFlashSaleModal, setShowFlashSaleModal] = useState(false);
  const [editingFlashSale, setEditingFlashSale] = useState<AdminFlashSale | null>(null);
  const [expandedFlashSaleId, setExpandedFlashSaleId] = useState<string | null>(null);

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

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['admin-tickets', ticketStatusFilter],
    queryFn: () => adminApi.getTickets(ticketStatusFilter || undefined),
    enabled: tab === 'tickets',
  });

  const queryClient = useQueryClient();

  const { data: faqs = [], isLoading: faqsLoading } = useQuery({
    queryKey: ['admin-faq'],
    queryFn: () => adminApi.getAllFaq(),
    enabled: tab === 'faq',
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => adminApi.listProducts(),
    enabled: tab === 'products',
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminApi.listCategories(),
    enabled: tab === 'products' || showProductModal,
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['admin-reviews', reviewStatusFilter],
    queryFn: () => adminApi.getReviews(reviewStatusFilter || undefined),
    enabled: tab === 'reviews',
  });

  const { data: flashSales = [], isLoading: flashSalesLoading } = useQuery({
    queryKey: ['admin-flash-sales'],
    queryFn: () => adminApi.getFlashSales(),
    enabled: tab === 'flashsales',
  });

  const deleteFaqMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteFaq(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faq'] });
      setDeletingFaqId(null);
    },
  });

  const toggleFaqPublishedMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      adminApi.updateFaq(id, { isPublished }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-faq'] }),
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const deleteFlashSaleMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteFlashSale(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flash-sales'] });
      setExpandedFlashSaleId(null);
    },
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

      {/* Tickets tab */}
      {tab === 'tickets' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
            <h2 className="mr-auto text-sm font-semibold text-gray-900">
              {ticketsLoading ? 'Đang tải...' : `${tickets.length} yêu cầu hỗ trợ`}
            </h2>
            {/* Status filter tabs */}
            {[
              { label: 'Tất cả', value: '' },
              { label: 'Mở', value: 'OPEN' },
              { label: 'Đang xử lý', value: 'IN_PROGRESS' },
              { label: 'Đã giải quyết', value: 'RESOLVED' },
              { label: 'Đã đóng', value: 'CLOSED' },
            ].map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTicketStatusFilter(value)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  ticketStatusFilter === value
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Email khách</th>
                  <th className="px-4 py-2 text-left">Chủ đề</th>
                  <th className="px-4 py-2 text-left">Danh mục</th>
                  <th className="px-4 py-2 text-left">Trạng thái</th>
                  <th className="px-4 py-2 text-left">Ngày tạo</th>
                  <th className="px-4 py-2 text-left">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <TicketRow key={ticket.id} ticket={ticket} />
                ))}
              </tbody>
            </table>
            {!ticketsLoading && tickets.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có yêu cầu hỗ trợ.</p>
            )}
          </div>
        </div>
      )}

      {/* FAQ tab */}
      {tab === 'faq' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">
              {faqsLoading ? 'Đang tải...' : `${faqs.length} FAQ`}
            </h2>
            <button
              type="button"
              onClick={() => { setEditingFaq(null); setShowFaqModal(true); }}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              + Thêm FAQ
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Câu hỏi</th>
                  <th className="px-4 py-2 text-left">Danh mục</th>
                  <th className="px-4 py-2 text-left">Đã đăng</th>
                  <th className="px-4 py-2 text-left">Thứ tự</th>
                  <th className="px-4 py-2 text-left">Sửa</th>
                  <th className="px-4 py-2 text-left">Xóa</th>
                </tr>
              </thead>
              <tbody>
                {faqs.map((faq) => (
                  <tr key={faq.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-900">
                      {faq.question}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {TICKET_CATEGORY_LABELS[faq.category] ?? faq.category}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          toggleFaqPublishedMutation.mutate({
                            id: faq.id,
                            isPublished: !faq.isPublished,
                          })
                        }
                        disabled={toggleFaqPublishedMutation.isPending}
                        aria-pressed={faq.isPublished}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium disabled:opacity-50 ${
                          faq.isPublished
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {faq.isPublished ? 'Đang đăng' : 'Ẩn'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{faq.sortOrder}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => { setEditingFaq(faq); setShowFaqModal(true); }}
                        className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Sửa
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {deletingFaqId === faq.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => deleteFaqMutation.mutate(faq.id)}
                            disabled={deleteFaqMutation.isPending}
                            className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Xác nhận
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingFaqId(null)}
                            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingFaqId(faq.id)}
                          className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Xóa
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!faqsLoading && faqs.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có FAQ nào.</p>
            )}
          </div>
        </div>
      )}

      {/* Products tab */}
      {tab === 'products' && (() => {
        const allProducts = productsData?.items ?? [];
        const filtered = productSearch.trim()
          ? allProducts.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
          : allProducts;
        return (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <h2 className="mr-auto text-sm font-semibold text-gray-900">
                {productsLoading ? 'Đang tải...' : `${allProducts.length} sản phẩm`}
              </h2>
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Tìm sản phẩm..."
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none w-48"
              />
              <button
                type="button"
                onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 whitespace-nowrap"
              >
                + Thêm sản phẩm
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Hình</th>
                    <th className="px-4 py-2 text-left">Tên sản phẩm</th>
                    <th className="px-4 py-2 text-left">Danh mục</th>
                    <th className="px-4 py-2 text-left">Giá (VND)</th>
                    <th className="px-4 py-2 text-left">Kho</th>
                    <th className="px-4 py-2 text-left">Đánh giá</th>
                    <th className="px-4 py-2 text-left">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => {
                    const img = product.images.find((i) => i.isPrimary) ?? product.images[0];
                    return (
                      <tr key={product.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {img ? (
                            <img src={img.url} alt={img.alt ?? product.name} className="h-10 w-10 rounded-md object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-gray-100" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 max-w-[200px] truncate">{product.name}</p>
                          <p className="text-xs text-gray-400">{product.slug}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{product.category.name}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {formatVND(product.priceVnd)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${product.stock <= 10 ? 'text-red-600' : 'text-gray-900'}`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          ★ {product.averageRating.toFixed(1)} ({product.reviewCount})
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => { setEditingProduct(product); setShowProductModal(true); }}
                              className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Xóa sản phẩm "${product.name}"?`)) {
                                  deleteProductMutation.mutate(product.id);
                                }
                              }}
                              disabled={deleteProductMutation.isPending}
                              className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!productsLoading && filtered.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-gray-400">
                  {productSearch ? 'Không tìm thấy sản phẩm.' : 'Chưa có sản phẩm nào.'}
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Reviews tab */}
      {tab === 'reviews' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
            <h2 className="mr-auto text-sm font-semibold text-gray-900">
              {reviewsLoading ? 'Đang tải...' : `${reviews.length} đánh giá`}
            </h2>
            {[
              { label: 'Tất cả', value: '' },
              { label: 'Chờ duyệt', value: 'PENDING' },
              { label: 'Đã duyệt', value: 'APPROVED' },
              { label: 'Từ chối', value: 'REJECTED' },
            ].map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => setReviewStatusFilter(value)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  reviewStatusFilter === value
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Sản phẩm</th>
                  <th className="px-4 py-2 text-left">Người dùng</th>
                  <th className="px-4 py-2 text-left">Sao</th>
                  <th className="px-4 py-2 text-left">Nội dung</th>
                  <th className="px-4 py-2 text-left">Trạng thái</th>
                  <th className="px-4 py-2 text-left">Ngày</th>
                  <th className="px-4 py-2 text-left">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => <ReviewRow key={review.id} review={review} />)}
              </tbody>
            </table>
            {!reviewsLoading && reviews.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Không có đánh giá nào.</p>
            )}
          </div>
        </div>
      )}

      {/* Flash Sales tab */}
      {tab === 'flashsales' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">
              {flashSalesLoading ? 'Đang tải...' : `${flashSales.length} Flash Sale`}
            </h2>
            <button
              type="button"
              onClick={() => { setEditingFlashSale(null); setShowFlashSaleModal(true); }}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              + Tạo Flash Sale
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Bắt đầu</th>
                  <th className="px-4 py-2 text-left">Kết thúc</th>
                  <th className="px-4 py-2 text-left">Trạng thái</th>
                  <th className="px-4 py-2 text-left">Số SP</th>
                  <th className="px-4 py-2 text-left">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {flashSales.map((sale) => (
                  <>
                    <tr key={sale.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(sale.startAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(sale.endAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          sale.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {sale.isActive ? 'Đang bật' : 'Tắt'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{sale.items.length} sản phẩm</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedFlashSaleId((prev) => prev === sale.id ? null : sale.id)
                            }
                            className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                              expandedFlashSaleId === sale.id
                                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            Sản phẩm
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingFlashSale(sale); setShowFlashSaleModal(true); }}
                            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Xóa Flash Sale này?')) {
                                deleteFlashSaleMutation.mutate(sale.id);
                              }
                            }}
                            disabled={deleteFlashSaleMutation.isPending}
                            className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedFlashSaleId === sale.id && (
                      <FlashSaleItemsPanel key={`items-${sale.id}`} sale={sale} />
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {!flashSalesLoading && flashSales.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có Flash Sale nào.</p>
            )}
          </div>
        </div>
      )}

      {/* Flash Sale modal */}
      {showFlashSaleModal && (
        <FlashSaleModal
          existing={editingFlashSale ?? undefined}
          onClose={() => { setShowFlashSaleModal(false); setEditingFlashSale(null); }}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-flash-sales'] })}
        />
      )}

      {/* FAQ modal */}
      {showFaqModal && (
        <FaqModal
          existing={editingFaq ?? undefined}
          onClose={() => { setShowFaqModal(false); setEditingFaq(null); }}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-faq'] })}
        />
      )}

      {/* Product modal */}
      {showProductModal && (
        <ProductModal
          existing={editingProduct ?? undefined}
          categories={categories}
          onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-products'] })}
        />
      )}
    </div>
  );
}
