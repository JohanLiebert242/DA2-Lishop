'use client';

import { useQuery } from '@tanstack/react-query';
import { CreditCard, CircleDollarSign, CheckCircle2, Clock } from 'lucide-react';
import { formatVND } from '@lishop/shared';
import { sellerApi } from '@/lib/seller-api';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_METHOD_LABELS } from '../_constants';
import { SellerPageHeader } from '../_components/seller-page-header';
import { SellerMetricCard } from '../_components/seller-metric-card';
import { SellerEmptyState } from '../_components/seller-empty-state';

export default function PaymentsPage() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: () => sellerApi.getOrders(),
  });

  const payments = orders.filter((o) => o.payment).map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    method: o.payment!.method,
    amountVnd: o.payment!.amountVnd,
    status: o.payment!.status,
    createdAt: o.createdAt,
    user: o.user,
  }));

  const totalRevenue = payments.reduce((sum, p) => sum + p.amountVnd, 0);
  const completedCount = payments.filter((p) => p.status === 'COMPLETED').length;
  const pendingCount = payments.filter((p) => p.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <SellerPageHeader
        icon={CreditCard}
        title="Thanh toán"
        description="Theo dõi lịch sử thanh toán từ các đơn hàng của cửa hàng."
        badge="Vận hành"
        tone="cyan"
        stats={[
          { label: 'Tổng giao dịch', value: isLoading ? '...' : `${payments.length}` },
          { label: 'Đã thanh toán', value: isLoading ? '...' : `${completedCount}` },
          { label: 'Chờ thanh toán', value: isLoading ? '...' : `${pendingCount}` },
          { label: 'Tổng doanh thu', value: isLoading ? '...' : formatVND(totalRevenue) },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SellerMetricCard icon={CircleDollarSign} label="Tổng doanh thu" value={isLoading ? '...' : formatVND(totalRevenue)} hint="Từ các giao dịch thanh toán" tone="emerald" />
        <SellerMetricCard icon={CheckCircle2} label="Đã thanh toán" value={isLoading ? '...' : `${completedCount}`} hint="Giao dịch thành công" tone="indigo" />
        <SellerMetricCard icon={Clock} label="Chờ thanh toán" value={isLoading ? '...' : `${pendingCount}`} hint="Giao dịch đang chờ xử lý" tone="amber" />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            {isLoading ? 'Đang tải...' : `${payments.length} giao dịch`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Mã đơn</th>
                <th className="px-5 py-3 text-left">Khách hàng</th>
                <th className="px-5 py-3 text-left">Phương thức</th>
                <th className="px-5 py-3 text-left">Số tiền</th>
                <th className="px-5 py-3 text-left">Trạng thái</th>
                <th className="px-5 py-3 text-left">Ngày</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-4 text-sm font-mono text-slate-700">#{payment.orderNumber}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {payment.user.firstName} {payment.user.lastName}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-900">{formatVND(payment.amountVnd)}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_STATUS_COLORS[payment.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {new Date(payment.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && payments.length === 0 && (
            <div className="p-5">
              <SellerEmptyState
                icon={CreditCard}
                title="Chưa có giao dịch"
                description="Khi có đơn hàng được thanh toán, lịch sử giao dịch sẽ hiển thị tại đây."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
