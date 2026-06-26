'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import { sellerApi } from '../../../../lib/seller-api';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Hoàn tiền',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-700',
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const { data: order, isLoading } = useQuery({
    queryKey: ['seller-order', orderId],
    queryFn: () => sellerApi.getOrderDetail(orderId),
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Đang tải...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <Package className="mb-3 h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-500">Đơn hàng không tồn tại.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </button>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Đơn hàng {order.orderNumber}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Đặt ngày {new Date(order.createdAt).toLocaleDateString('vi-VN')}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGE[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Thông tin khách hàng</h2>
        <div className="space-y-1 text-sm text-gray-700">
          <p>{order.user.firstName} {order.user.lastName}</p>
          <p>{order.user.email}</p>
          {order.address ? (
            <>
              <p>{order.address.fullName} - {order.address.phone}</p>
              <p className="text-gray-500">{order.address.city}</p>
            </>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Sản phẩm</h2>
        <table className="w-full">
          <thead className="text-xs uppercase text-gray-500">
            <tr>
              <th className="pb-2 text-left font-medium">Sản phẩm</th>
              <th className="pb-2 text-left font-medium">SL</th>
              <th className="pb-2 text-right font-medium">Đơn giá</th>
              <th className="pb-2 text-right font-medium">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="py-3 text-sm text-gray-900">
                  {item.productName}
                  {item.variantName ? <span className="ml-1 text-xs text-gray-500">({item.variantName})</span> : null}
                </td>
                <td className="py-3 text-sm text-gray-700">{item.quantity}</td>
                <td className="py-3 text-right text-sm text-gray-700">
                  {item.unitPriceVnd.toLocaleString('vi-VN')}₫
                </td>
                <td className="py-3 text-right text-sm font-medium text-gray-900">
                  {item.totalPriceVnd.toLocaleString('vi-VN')}₫
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex justify-end border-t pt-4">
          <div className="text-right">
            <p className="text-xs text-gray-500">Tổng đơn hàng</p>
            <p className="text-lg font-bold text-gray-900">{order.totalVnd.toLocaleString('vi-VN')}₫</p>
          </div>
        </div>
      </div>

      {order.payment ? (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Thanh toán</h2>
          <div className="space-y-1 text-sm text-gray-700">
            <p>Phương thức: {order.payment.method}</p>
            <p>Số tiền: {order.payment.amountVnd.toLocaleString('vi-VN')}₫</p>
            <p>Trạng thái: {order.payment.status === 'COMPLETED' ? 'Đã thanh toán' : 'Chưa thanh toán'}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
