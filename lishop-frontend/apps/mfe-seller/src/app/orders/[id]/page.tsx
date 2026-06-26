'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package, ShoppingBag, User, CreditCard } from 'lucide-react';
import { formatVND } from '@lishop/shared';
import { sellerApi } from '@/lib/seller-api';
import { STATUS_LABELS, STATUS_COLORS } from '../../_constants';

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
        <p className="text-slate-500">Đang tải...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <Package className="mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm text-slate-500">Đơn hàng không tồn tại.</p>
      </div>
    );
  }

  const statusLabel = STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] ?? order.status;
  const statusColor = STATUS_COLORS[order.status as keyof typeof STATUS_COLORS] ?? 'bg-gray-100 text-gray-700';

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </button>

      <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">Đơn hàng {order.orderNumber}</h1>
              <p className="mt-1 text-sm text-slate-500">
                Đặt ngày {new Date(order.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
          <span className={`rounded-full px-4 py-1.5 text-xs font-semibold ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <User className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-950">Thông tin khách hàng</h2>
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <p className="font-medium">{order.user.firstName} {order.user.lastName}</p>
            <p>{order.user.email}</p>
            {order.address && (
              <>
                <p>{order.address.fullName} - {order.address.phone}</p>
                <p className="text-slate-500">{order.address.city}</p>
              </>
            )}
          </div>
        </div>

        {order.payment && (
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CreditCard className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-slate-950">Thanh toán</h2>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p>Phương thức: {order.payment.method}</p>
              <p>Số tiền: {formatVND(order.payment.amountVnd)}</p>
              <p>
                Trạng thái:{' '}
                <span className={order.payment.status === 'COMPLETED' ? 'text-emerald-600 font-semibold' : 'text-amber-600'}>
                  {order.payment.status === 'COMPLETED' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Package className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-950">Sản phẩm</h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="pb-3 text-left font-medium">Sản phẩm</th>
                <th className="pb-3 text-left font-medium">SL</th>
                <th className="pb-3 text-right font-medium">Đơn giá</th>
                <th className="pb-3 text-right font-medium">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="py-4 text-sm text-slate-900">
                    {item.productName}
                    {item.variantName ? (
                      <span className="ml-1 text-xs text-slate-500">({item.variantName})</span>
                    ) : null}
                  </td>
                  <td className="py-4 text-sm text-slate-700">{item.quantity}</td>
                  <td className="py-4 text-right text-sm text-slate-700">{formatVND(item.unitPriceVnd)}</td>
                  <td className="py-4 text-right text-sm font-semibold text-slate-900">{formatVND(item.totalPriceVnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tổng đơn hàng</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{formatVND(order.totalVnd)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
