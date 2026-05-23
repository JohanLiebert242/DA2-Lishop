'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { formatVND } from '@lishop/shared';
import { ordersApi, OrderStatus } from '../../lib/orders-api';
import { AccountSidebar } from '../../components/account-sidebar';

const AUTH_URL = process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001';

const STATUS_META: Record<OrderStatus, { label: string; color: string; dot: string }> = {
  PENDING:    { label: 'Chờ xác nhận', color: 'bg-amber-50 text-amber-700 border border-amber-200',   dot: 'bg-amber-400' },
  PROCESSING: { label: 'Đang xử lý',  color: 'bg-blue-50 text-blue-700 border border-blue-200',       dot: 'bg-blue-400' },
  SHIPPED:    { label: 'Đang giao',   color: 'bg-violet-50 text-violet-700 border border-violet-200', dot: 'bg-violet-400' },
  DELIVERED:  { label: 'Đã giao',    color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400' },
  CANCELLED:  { label: 'Đã hủy',     color: 'bg-red-50 text-red-700 border border-red-200',           dot: 'bg-red-400' },
  REFUNDED:   { label: 'Đã hoàn tiền', color: 'bg-stone-100 text-stone-600 border border-stone-200', dot: 'bg-stone-400' },
};

function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="flex justify-between">
        <div className="h-4 w-24 rounded bg-stone-100" />
        <div className="h-6 w-20 rounded-full bg-stone-100" />
      </div>
      <div className="mt-4 h-3 w-48 rounded bg-stone-100" />
      <div className="mt-2 h-4 w-28 rounded bg-stone-100" />
    </div>
  );
}

export default function OrdersPage() {
  useEffect(() => {
    if (!localStorage.getItem('lishop_at')) window.location.replace(`${AUTH_URL}/login`);
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => ordersApi.getOrders(),
    retry: false,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex gap-7">
        <AccountSidebar activeSection="orders" />

        <div className="flex-1 min-w-0">
          {/* Page title */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-stone-900 tracking-tight">Đơn hàng của tôi</h1>
              <p className="mt-0.5 text-sm text-muted">Theo dõi và quản lý các đơn hàng</p>
            </div>
            {!isLoading && orders.length > 0 && (
              <span className="rounded-xl bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700">
                {orders.length} đơn hàng
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-20 text-center gap-4">
              <span className="text-6xl">📦</span>
              <div>
                <p className="text-lg font-bold text-stone-700">Chưa có đơn hàng nào</p>
                <p className="mt-1 text-sm text-muted">Hãy bắt đầu mua sắm để tạo đơn hàng đầu tiên!</p>
              </div>
              <a href={process.env['NEXT_PUBLIC_MFE_CATALOG_URL'] ?? 'http://localhost:3002/products'}
                className="btn-primary mt-2">
                Mua sắm ngay
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const meta = STATUS_META[order.status];
                return (
                  <Link key={order.id} href={`/orders/${order.id}`} className="block group">
                    <div className="card p-5 hover:border-indigo-200 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-black text-stone-900 text-base">#{order.orderNumber}</span>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.color}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs text-muted">
                            {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                              weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-black text-indigo-600">{formatVND(order.totalVnd)}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-warm pt-4">
                        <p className="text-xs text-muted line-clamp-1 flex-1 mr-4">
                          <span className="font-semibold text-stone-600">{order.items.length} sản phẩm: </span>
                          {order.items.slice(0, 2).map(i => i.productName).join(', ')}
                          {order.items.length > 2 && ` +${order.items.length - 2} khác`}
                        </p>
                        <span className="shrink-0 text-xs font-semibold text-indigo-600 group-hover:text-indigo-800 transition-colors">
                          Xem chi tiết →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
