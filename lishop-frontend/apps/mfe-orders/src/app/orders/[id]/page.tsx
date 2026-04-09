'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { formatVND } from '@lishop/shared';
import { ordersApi, OrderStatus } from '../../../lib/orders-api';

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang giao hàng',
  DELIVERED: 'Đã giao thành công',
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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  COD: 'Thanh toán khi nhận hàng',
  STRIPE: 'Stripe',
  VNPAY: 'VNPay',
  MOMO: 'Momo',
  PAYPAL: 'PayPal',
};

interface Props {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: Props) {
  const { id } = use(params);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getOrder(id),
    retry: false,
  });

  if (isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-400">Đang tải...</div>;
  }

  if (isError || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-red-600">Không tìm thấy đơn hàng.</p>
        <Link href="/orders" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          ← Danh sách đơn hàng
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/orders" className="text-sm text-gray-500 hover:text-indigo-600">
          ← Đơn hàng
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-700">#{order.orderNumber}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Đơn hàng #{order.orderNumber}</h1>
          <p className="text-xs text-gray-500 mt-1">
            Đặt lúc {new Date(order.createdAt).toLocaleString('vi-VN')}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${STATUS_COLORS[order.status]}`}>
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="space-y-4">
        {/* Items */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Sản phẩm</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">{item.productName}</p>
                  <p className="text-xs text-gray-500">
                    {formatVND(item.unitPriceVnd)} × {item.quantity}
                  </p>
                </div>
                <p className="font-semibold text-gray-900">{formatVND(item.totalPriceVnd)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Tạm tính</span>
              <span>{formatVND(order.subtotalVnd)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Phí vận chuyển</span>
              <span>{formatVND(order.shippingFeeVnd)}</span>
            </div>
            {order.discountVnd > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Giảm giá</span>
                <span>− {formatVND(order.discountVnd)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-bold text-gray-900">
              <span>Tổng cộng</span>
              <span className="text-indigo-600">{formatVND(order.totalVnd)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Shipping address */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Địa chỉ giao hàng</h2>
            <p className="text-sm font-medium text-gray-800">{order.address.fullName}</p>
            <p className="text-xs text-gray-600">{order.address.phone}</p>
            <p className="text-xs text-gray-600 mt-1">
              {order.address.street}, {order.address.district}, {order.address.city}
            </p>
          </div>

          {/* Payment */}
          {order.payment && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-gray-900">Thanh toán</h2>
              <p className="text-sm text-gray-700">{PAYMENT_METHOD_LABELS[order.payment.method] ?? order.payment.method}</p>
              <p className="text-xs text-gray-500 mt-1">
                Trạng thái: {order.payment.status === 'PENDING' ? 'Chờ thanh toán' :
                  order.payment.status === 'COMPLETED' ? 'Đã thanh toán' : order.payment.status}
              </p>
              <p className="mt-2 text-sm font-bold text-indigo-600">{formatVND(order.payment.amountVnd)}</p>
            </div>
          )}
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-gray-900">Ghi chú</h2>
            <p className="text-sm text-gray-600">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
