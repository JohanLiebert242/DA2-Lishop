'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { formatVND, hasSessionCookie } from '@lishop/shared';
import { ordersApi, OrderStatus, type OrderSummary } from '../../lib/orders-api';
import { AccountSidebar } from '../../components/account-sidebar';

const AUTH_URL = process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001';
const CATALOG_BASE_URL = process.env['NEXT_PUBLIC_MFE_CATALOG_URL'] ?? 'http://localhost:3002';
const CATALOG_PRODUCTS_URL = `${CATALOG_BASE_URL}/products`;
const SHOP_NAME = 'Lishop Official Store';

const STATUS_META: Record<OrderStatus, { label: string; color: string; dot: string }> = {
  PENDING: { label: 'Chờ xác nhận', color: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-400' },
  PROCESSING: { label: 'Đang xử lý', color: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-400' },
  SHIPPED: { label: 'Đang giao', color: 'bg-violet-50 text-violet-700 border border-violet-200', dot: 'bg-violet-400' },
  DELIVERED: { label: 'Đã giao', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400' },
  CANCELLED: { label: 'Đã hủy', color: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-400' },
  REFUNDED: { label: 'Đã hoàn tiền', color: 'bg-stone-100 text-stone-600 border border-stone-200', dot: 'bg-stone-400' },
};

const STATUS_OPTIONS: Array<{ value: OrderStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ xác nhận' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'SHIPPED', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'REFUNDED', label: 'Đã hoàn tiền' },
];

function SkeletonCard() {
  return (
    <div className="card animate-pulse p-5">
      <div className="flex justify-between">
        <div className="h-4 w-24 rounded bg-stone-100" />
        <div className="h-6 w-20 rounded-full bg-stone-100" />
      </div>
      <div className="mt-4 h-3 w-48 rounded bg-stone-100" />
      <div className="mt-2 h-4 w-28 rounded bg-stone-100" />
    </div>
  );
}

function formatOrderDate(value: string) {
  return new Date(value).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function compactDate(value: string) {
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

interface ShopChatMessage {
  from: 'buyer' | 'shop';
  text: string;
  time: string;
}

function OrderShopChatPanel({
  order,
  onClose,
}: {
  order: OrderSummary;
  onClose: () => void;
}) {
  const storageKey = `lishop_order_shop_chat_${order.id}`;
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ShopChatMessage[]>([]);
  const productNames = order.items.map((item) => item.productName).join(', ');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        setMessages(JSON.parse(saved) as ShopChatMessage[]);
        return;
      }
    } catch {
      // Keep chat usable even when storage is unavailable or contains stale data.
    }

    setMessages([
      {
        from: 'shop',
        text: `Chào bạn, ${SHOP_NAME} có thể hỗ trợ về đơn ${order.orderNumber}${productNames ? ` (${productNames})` : ''}.`,
        time: new Date().toISOString(),
      },
    ]);
  }, [order.orderNumber, productNames, storageKey]);

  useEffect(() => {
    if (messages.length === 0) return;
    window.localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;

    const now = new Date().toISOString();
    setMessages((current) => [
      ...current,
      { from: 'buyer', text, time: now },
      {
        from: 'shop',
        text: 'Shop đã nhận tin nhắn. Tư vấn viên sẽ phản hồi sớm trong khung chat này.',
        time: now,
      },
    ]);
    setInput('');
  }

  return (
    <div
      data-testid="order-shop-chat-panel"
      className="fixed bottom-6 right-6 z-50 flex h-[460px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-2xl shadow-stone-900/20"
    >
      <div className="flex items-center justify-between bg-stone-950 px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{SHOP_NAME}</p>
          <p className="mt-0.5 text-xs font-semibold text-stone-300">Chat về đơn {order.orderNumber}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-stone-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Đóng chat với người bán"
        >
          x
        </button>
      </div>

      <div className="border-b border-stone-100 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700">
        {productNames || 'Đơn hàng của bạn'}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-stone-50 px-3 py-3">
        {messages.map((message, index) => (
          <div key={`${message.time}-${index}`} className={`flex ${message.from === 'buyer' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-6 ${
                message.from === 'buyer'
                  ? 'bg-indigo-600 text-white'
                  : 'border border-stone-200 bg-white text-stone-700 shadow-sm'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-t border-stone-100 bg-white px-3 py-3">
        <input
          data-testid="order-shop-chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') sendMessage();
          }}
          placeholder="Nhập tin nhắn cho shop..."
          className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-stone-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
        <button
          data-testid="order-shop-chat-send"
          type="button"
          onClick={sendMessage}
          disabled={!input.trim()}
          className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-black text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [chatOrder, setChatOrder] = useState<OrderSummary | null>(null);

  useEffect(() => {
    if (!hasSessionCookie()) window.location.replace(`${AUTH_URL}/login`);
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => ordersApi.getOrders(),
    retry: false,
  });

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
      const searchableText = [
        order.orderNumber,
        SHOP_NAME,
        ...order.items.flatMap((item) => [item.productName, item.variantName ?? '', item.variantSku ?? '']),
      ].join(' ').toLowerCase();
      const matchesSearch = !keyword || searchableText.includes(keyword);

      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex gap-7">
        <AccountSidebar activeSection="orders" />

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-stone-900">Đơn hàng của tôi</h1>
              <p className="mt-0.5 text-sm text-muted">Theo dõi và quản lý các đơn hàng</p>
            </div>
            {!isLoading && orders.length > 0 && (
              <span className="rounded-xl bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700">
                {filteredOrders.length}/{orders.length} đơn hàng
              </span>
            )}
          </div>

          <div className="mb-5 rounded-2xl border border-warm bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative min-w-0 flex-1">
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm theo mã đơn, tên sản phẩm, SKU..."
                  className="input-field w-full py-2.5 pl-9 pr-4 text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = statusFilter === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStatusFilter(option.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-warm bg-white text-stone-600 hover:border-indigo-200 hover:bg-indigo-50/60'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="card flex flex-col items-center justify-center gap-4 py-20 text-center">
              <span className="text-6xl">📦</span>
              <div>
                <p className="text-lg font-bold text-stone-700">Chưa có đơn hàng nào</p>
                <p className="mt-1 text-sm text-muted">Hãy bắt đầu mua sắm để tạo đơn hàng đầu tiên.</p>
              </div>
              <a href={CATALOG_PRODUCTS_URL} className="btn-primary mt-2">
                Mua sắm ngay
              </a>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="text-5xl">⌕</span>
              <div>
                <p className="font-bold text-stone-700">Không tìm thấy đơn hàng phù hợp</p>
                <p className="mt-1 text-sm text-muted">Thử đổi từ khóa hoặc bộ lọc trạng thái.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                }}
                className="rounded-xl border border-warm px-4 py-2 text-sm font-bold text-stone-600 transition hover:bg-warm-100"
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const meta = STATUS_META[order.status];
                const firstItem = order.items[0];
                const productSummary = order.items
                  .slice(0, 2)
                  .map((item) => `${item.productName}${item.variantName ? ` - ${item.variantName}` : ''}`)
                  .join(', ');
                const deliveredAt = order.status === 'DELIVERED' ? order.shipment?.deliveredAt : null;
                const buyAgainHref = firstItem
                  ? firstItem.productSlug
                    ? `${CATALOG_PRODUCTS_URL}/${firstItem.productSlug}`
                    : `${CATALOG_PRODUCTS_URL}?q=${encodeURIComponent(firstItem.productName)}`
                  : CATALOG_PRODUCTS_URL;
                return (
                  <div key={order.id} className="card p-5 transition-all hover:border-indigo-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <Link href={`/orders/${order.id}`} className="text-base font-black text-stone-900 transition hover:text-indigo-700">
                            #{order.orderNumber}
                          </Link>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.color}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                          <span>Đặt ngày: {formatOrderDate(order.createdAt)}</span>
                          <span className="font-semibold text-stone-600">Cửa hàng: {SHOP_NAME}</span>
                          {deliveredAt && (
                            <span className="font-semibold text-emerald-700">Giao thành công: {compactDate(deliveredAt)}</span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-lg font-black text-indigo-600">{formatVND(order.totalVnd)}</p>
                        <p className="mt-0.5 text-xs text-muted">{order.items.length} sản phẩm</p>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-warm pt-4">
                      <p className="text-xs text-muted">
                        <span className="font-semibold text-stone-600">{order.items.length} sản phẩm: </span>
                        {productSummary}
                        {order.items.length > 2 && ` +${order.items.length - 2} khác`}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/orders/${order.id}#review`}
                            className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                              order.status === 'DELIVERED'
                                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                : 'border-warm bg-stone-50 text-stone-400'
                            }`}
                            aria-disabled={order.status !== 'DELIVERED'}
                          >
                            Đánh giá
                          </Link>
                          <Link
                            href={`/orders/${order.id}#return`}
                            className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                              order.status === 'DELIVERED' || order.status === 'REFUNDED'
                                ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                : 'border-warm bg-stone-50 text-stone-400'
                            }`}
                            aria-disabled={order.status !== 'DELIVERED' && order.status !== 'REFUNDED'}
                          >
                            Yêu cầu hoàn tiền
                          </Link>
                          <button
                            type="button"
                            onClick={() => setChatOrder(order)}
                            className="rounded-xl border border-warm bg-white px-3 py-2 text-xs font-bold text-stone-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            Liên hệ người bán
                          </button>
                          <a
                            href={buyAgainHref}
                            className="rounded-xl border border-warm bg-white px-3 py-2 text-xs font-bold text-stone-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            Mua lại
                          </a>
                        </div>

                        <Link href={`/orders/${order.id}`} className="text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-800">
                          Xem chi tiết →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {chatOrder && <OrderShopChatPanel order={chatOrder} onClose={() => setChatOrder(null)} />}
    </div>
  );
}
