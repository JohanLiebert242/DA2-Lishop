'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { formatVND } from '@lishop/shared';
import {
  ordersApi,
  OrderStatus,
  getTracking,
  getMyReturn,
  createReturn,
  ReturnReason,
  ReturnStatus,
  CreateReturnInput,
  InvoiceData,
} from '../../../lib/orders-api';

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

const TIMELINE_STEPS: OrderStatus[] = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const PROVIDER_LABELS: Record<string, string> = {
  GHN: 'Giao Hàng Nhanh',
  GHTK: 'Giao Hàng Tiết Kiệm',
  VIETTEL_POST: 'Viettel Post',
};

const SHIPMENT_EVENT_LABELS: Record<string, string> = {
  CREATED: 'Đã tạo đơn',
  PICKED_UP: 'Đã lấy hàng',
  IN_TRANSIT: 'Đang vận chuyển',
  ARRIVED: 'Đã đến bưu cục',
  DELIVERED: 'Đã giao hàng',
  FAILED: 'Giao thất bại',
};

const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  DAMAGED: 'Hàng bị hỏng',
  WRONG_ITEM: 'Sai sản phẩm',
  NOT_AS_DESCRIBED: 'Không đúng mô tả',
  CHANGED_MIND: 'Đổi ý',
  OTHER: 'Khác',
};

const RETURN_STATUS_COLORS: Record<ReturnStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  RECEIVED: 'bg-violet-100 text-violet-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
};

const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  PENDING: 'Chờ xử lý',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  RECEIVED: 'Đã nhận hàng',
  COMPLETED: 'Hoàn tất',
};

function getEventDotColor(status: string): string {
  if (status === 'DELIVERED') return 'bg-emerald-500';
  if (status === 'FAILED') return 'bg-red-500';
  return 'bg-indigo-500';
}

function formatVariantAttributes(attributes: Record<string, string> | null): string {
  return Object.entries(attributes ?? {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(' · ');
}

function StatusTimeline({ status }: { status: OrderStatus }) {
  const isCancelled = status === 'CANCELLED' || status === 'REFUNDED';
  const currentIndex = TIMELINE_STEPS.indexOf(status);

  if (isCancelled) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-center text-sm font-medium text-red-700">
          {STATUS_LABELS[status]}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Trạng thái đơn hàng</h2>
      <div className="flex items-center">
        {TIMELINE_STEPS.map((step, index) => {
          const isDone = index <= currentIndex;
          const isLast = index === TIMELINE_STEPS.length - 1;
          return (
            <div key={step} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    isDone ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {index + 1}
                </div>
                <span className={`mt-1 text-center text-xs ${isDone ? 'font-medium text-indigo-600' : 'text-gray-400'}`}>
                  {STATUS_LABELS[step]}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`h-0.5 flex-1 ${index < currentIndex ? 'bg-indigo-600' : 'bg-gray-200'}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: Props) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  // State — all declared unconditionally at top
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState<ReturnReason>('DAMAGED');
  const [returnDescription, setReturnDescription] = useState('');
  const [returnItemQtys, setReturnItemQtys] = useState<Record<string, number>>({});

  // Queries — all declared unconditionally at top
  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getOrder(id),
    retry: false,
  });

  const { data: trackingData } = useQuery({
    queryKey: ['tracking', id],
    queryFn: () => getTracking(id),
    retry: false,
  });

  const { data: myReturn } = useQuery({
    queryKey: ['my-return', id],
    queryFn: () => getMyReturn(id),
    retry: false,
  });

  const { data: invoice } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => ordersApi.getInvoice(id),
    enabled: order?.status === 'DELIVERED',
    retry: false,
  });

  const { data: refunds = [] } = useQuery({
    queryKey: ['my-refunds'],
    queryFn: () => ordersApi.getRefunds(),
    retry: false,
  });
  const refund = refunds.find((r) => r.orderId === id);

  // Mutations — all declared unconditionally at top
  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancelOrder(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', id], updated);
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    },
  });

  const returnMutation = useMutation({
    mutationFn: (input: CreateReturnInput) => createReturn(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-return', id] });
      setShowReturnModal(false);
      setReturnDescription('');
      setReturnItemQtys({});
    },
  });

  const paymentMutation = useMutation({
    mutationFn: () => ordersApi.initiatePayment(id),
    onSuccess: (res) => {
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        queryClient.invalidateQueries({ queryKey: ['order', id] });
      }
    },
  });

  const isCancellable = order?.status === 'PENDING' || order?.status === 'PROCESSING';
  const shipment = trackingData?.shipment ?? null;

  function handleDownloadInvoice(inv: InvoiceData) {
    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <title>Hóa đơn ${inv.invoiceNo}</title>
  <style>
    body { font-family: sans-serif; max-width: 640px; margin: 40px auto; color: #111; }
    h1 { font-size: 1.4rem; margin-bottom: 4px; }
    .meta { color: #555; font-size: 0.85rem; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    td { padding: 6px 8px; }
    tr:nth-child(even) { background: #f9f9f9; }
    .total-row td { font-weight: bold; border-top: 2px solid #333; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h1>Hóa đơn ${inv.invoiceNo}</h1>
  <div class="meta">Ngày xuất: ${new Date(inv.issuedAt).toLocaleDateString('vi-VN')}</div>
  <table>
    <tr><td>Khách hàng</td><td>${inv.billingName}</td></tr>
    <tr><td>Email</td><td>${inv.billingEmail}</td></tr>
    <tr><td>Điện thoại</td><td>${inv.billingPhone}</td></tr>
    <tr><td>Địa chỉ</td><td>${inv.billingAddress}</td></tr>
    <tr><td>Tạm tính</td><td>${inv.subtotalVnd.toLocaleString('vi-VN')}₫</td></tr>
    <tr><td>Phí vận chuyển</td><td>${inv.shippingFeeVnd.toLocaleString('vi-VN')}₫</td></tr>
    <tr><td>Giảm giá</td><td>−${inv.discountVnd.toLocaleString('vi-VN')}₫</td></tr>
    <tr><td>VAT (${inv.vatPercent}%)</td><td>${inv.vatVnd.toLocaleString('vi-VN')}₫</td></tr>
    <tr class="total-row"><td>Tổng cộng</td><td>${inv.totalVnd.toLocaleString('vi-VN')}₫</td></tr>
  </table>
  <br/>
  <button onclick="window.print()">In hóa đơn</button>
</body>
</html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  function handleReturnSubmit() {
    if (!order) return;
    const items = order.items
      .map((item) => ({
        orderItemId: item.id,
        quantity: returnItemQtys[item.id] ?? 0,
      }))
      .filter((item) => item.quantity > 0);

    returnMutation.mutate({
      orderId: id,
      reason: returnReason,
      description: returnDescription || undefined,
      items,
    });
  }

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
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${STATUS_COLORS[order.status]}`}>
            {STATUS_LABELS[order.status]}
          </span>
          {isCancellable && (
            <button
              type="button"
              aria-busy={cancelMutation.isPending}
              onClick={() => {
                if (window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) {
                  cancelMutation.mutate();
                }
              }}
              disabled={cancelMutation.isPending}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {cancelMutation.isPending ? 'Đang hủy...' : 'Hủy đơn'}
            </button>
          )}
        </div>
      </div>

      {cancelMutation.isError && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          {cancelMutation.error instanceof Error ? cancelMutation.error.message : 'Hủy đơn thất bại'}
        </p>
      )}

      <div className="space-y-4">
        {/* Status Timeline */}
        <StatusTimeline status={order.status} />

        {/* Items */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Sản phẩm</h2>
          <div className="space-y-3">
            {order.items.map((item) => {
              const variantAttributes = formatVariantAttributes(item.variantAttributes);

              return (
              <div key={item.id} className="flex justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">{item.productName}</p>
                  {(item.variantName || variantAttributes || item.variantSku) && (
                    <div className="mt-0.5 space-y-0.5">
                      {item.variantName && (
                        <p className="text-xs font-medium text-gray-600">{item.variantName}</p>
                      )}
                      {variantAttributes && (
                        <p className="text-xs text-gray-500">{variantAttributes}</p>
                      )}
                      {item.variantSku && (
                        <p className="text-[11px] text-gray-400">SKU: {item.variantSku}</p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    {formatVND(item.unitPriceVnd)} × {item.quantity}
                  </p>
                </div>
                <p className="font-semibold text-gray-900">{formatVND(item.totalPriceVnd)}</p>
              </div>
              );
            })}
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
              {order.payment.status === 'PENDING' && order.payment.method !== 'COD' && (
                <button
                  type="button"
                  onClick={() => paymentMutation.mutate()}
                  disabled={paymentMutation.isPending}
                  className="mt-3 w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {paymentMutation.isPending ? 'Đang chuyển hướng...' : 'Thanh toán ngay'}
                </button>
              )}
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

        {/* Shipment tracking */}
        {shipment && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Thông tin vận chuyển</h2>
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Đơn vị vận chuyển</p>
                <p className="font-medium text-gray-900">
                  {PROVIDER_LABELS[shipment.provider] ?? shipment.provider}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Mã vận đơn</p>
                <p className="font-medium text-gray-900">
                  {shipment.trackingNumber ?? 'Chưa có mã vận đơn'}
                </p>
              </div>
              {shipment.estimatedAt && (
                <div>
                  <p className="text-xs text-gray-500">Dự kiến giao</p>
                  <p className="font-medium text-gray-900">
                    {new Date(shipment.estimatedAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              )}
            </div>

            {shipment.events.length > 0 && (
              <div className="mt-3 border-t pt-3">
                <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Lịch sử vận chuyển</p>
                <div className="space-y-3">
                  {[...shipment.events].reverse().map((event) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="mt-1 flex-shrink-0">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${getEventDotColor(event.status)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {SHIPMENT_EVENT_LABELS[event.status] ?? event.status}
                          </p>
                          <p className="flex-shrink-0 text-xs text-gray-400">
                            {new Date(event.createdAt).toLocaleString('vi-VN')}
                          </p>
                        </div>
                        <p className="text-xs text-gray-600">{event.description}</p>
                        {event.location && (
                          <p className="text-xs text-gray-400">{event.location}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invoice card */}
        {order.status === 'DELIVERED' && invoice && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Hóa đơn</h2>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-700">
                <span className="text-gray-500">Số hóa đơn</span>
                <span className="font-medium">{invoice.invoiceNo}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span className="text-gray-500">Ngày xuất</span>
                <span>{new Date(invoice.issuedAt).toLocaleDateString('vi-VN')}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span className="text-gray-500">VAT ({invoice.vatPercent}%)</span>
                <span>{formatVND(invoice.vatVnd)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold text-gray-900">
                <span>Tổng có VAT</span>
                <span className="text-indigo-600">{formatVND(invoice.totalVnd)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadInvoice(invoice)}
              className="mt-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Tải hóa đơn
            </button>
          </div>
        )}

        {/* Refund status card */}
        {refund && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Hoàn tiền</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    refund.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : refund.status === 'PROCESSING'
                      ? 'bg-blue-100 text-blue-800'
                      : refund.status === 'FAILED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {refund.status === 'PENDING'
                    ? 'Chờ xử lý'
                    : refund.status === 'PROCESSING'
                    ? 'Đang xử lý'
                    : refund.status === 'COMPLETED'
                    ? 'Hoàn tất'
                    : 'Thất bại'}
                </span>
                <span className="font-semibold text-indigo-600">{formatVND(refund.amountVnd)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span className="text-gray-500">Phương thức</span>
                <span>
                  {refund.method === 'WALLET'
                    ? 'Hoàn vào ví'
                    : refund.method === 'ORIGINAL_PAYMENT'
                    ? 'Hoàn về phương thức thanh toán'
                    : 'Chuyển khoản thủ công'}
                </span>
              </div>
              {refund.adminNote && (
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-gray-700">
                  <span className="font-medium">Ghi chú admin: </span>
                  {refund.adminNote}
                </div>
              )}
              {refund.processedAt && (
                <p className="text-xs text-gray-400">
                  Xử lý lúc {new Date(refund.processedAt).toLocaleString('vi-VN')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Return request section */}
        {order.status === 'DELIVERED' && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Đổi trả hàng</h2>

            {myReturn ? (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${RETURN_STATUS_COLORS[myReturn.status]}`}>
                    {RETURN_STATUS_LABELS[myReturn.status]}
                  </span>
                  <span className="text-sm text-gray-600">
                    {RETURN_REASON_LABELS[myReturn.reason]}
                  </span>
                </div>
                {myReturn.description && (
                  <p className="text-sm text-gray-600 mb-2">{myReturn.description}</p>
                )}
                {myReturn.adminNote && (
                  <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <span className="font-medium">Ghi chú từ admin: </span>
                    {myReturn.adminNote}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  Yêu cầu tạo lúc {new Date(myReturn.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowReturnModal(true)}
                className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
              >
                Yêu cầu đổi trả
              </button>
            )}
          </div>
        )}
      </div>

      {/* Return modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-base font-semibold text-gray-900">Yêu cầu đổi trả hàng</h3>

            <div className="space-y-4">
              {/* Reason */}
              <div>
                <label htmlFor="return-reason" className="block text-xs font-medium text-gray-700 mb-1">
                  Lý do <span className="text-red-500">*</span>
                </label>
                <select
                  id="return-reason"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value as ReturnReason)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  {(Object.keys(RETURN_REASON_LABELS) as ReturnReason[]).map((r) => (
                    <option key={r} value={r}>{RETURN_REASON_LABELS[r]}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="return-description" className="block text-xs font-medium text-gray-700 mb-1">
                  Mô tả thêm (không bắt buộc)
                </label>
                <textarea
                  id="return-description"
                  value={returnDescription}
                  onChange={(e) => setReturnDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Mô tả chi tiết vấn đề..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none"
                />
                <p className="mt-1 text-right text-xs text-gray-400">{returnDescription.length}/500</p>
              </div>

              {/* Item quantities */}
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Sản phẩm cần đổi trả</p>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm text-gray-900">
                          {item.productName}
                          {item.variantName ? ` - ${item.variantName}` : ''}
                        </p>
                        <p className="text-xs text-gray-500">Đã mua: {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label htmlFor={`return-qty-${item.id}`} className="text-xs text-gray-500">
                          Số lượng trả:
                        </label>
                        <input
                          id={`return-qty-${item.id}`}
                          type="number"
                          min={0}
                          max={item.quantity}
                          value={returnItemQtys[item.id] ?? 0}
                          onChange={(e) =>
                            setReturnItemQtys((prev) => ({
                              ...prev,
                              [item.id]: Math.min(Number(e.target.value), item.quantity),
                            }))
                          }
                          className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm text-center focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {returnMutation.isError && (
              <p className="mt-3 text-sm text-red-600">
                {returnMutation.error instanceof Error ? returnMutation.error.message : 'Gửi yêu cầu thất bại'}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleReturnSubmit}
                disabled={returnMutation.isPending}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {returnMutation.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
