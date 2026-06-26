'use client';

import { useQuery } from '@tanstack/react-query';
import { Receipt, FileText, CircleDollarSign, CalendarDays } from 'lucide-react';
import { formatVND } from '@lishop/shared';
import { sellerApi } from '@/lib/seller-api';
import { SellerPageHeader } from '../_components/seller-page-header';
import { SellerMetricCard } from '../_components/seller-metric-card';
import { SellerEmptyState } from '../_components/seller-empty-state';

export default function InvoicesPage() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['my-invoices'],
    queryFn: () => sellerApi.getMyInvoices(),
  });

  const totalAmount = invoices.reduce((s, inv) => s + inv.totalVnd, 0);
  const totalVat = invoices.reduce((s, inv) => s + inv.vatVnd, 0);

  return (
    <div className="space-y-6">
      <SellerPageHeader
        icon={Receipt}
        title="Hóa đơn"
        description="Xem và quản lý hóa đơn cho các đơn hàng của cửa hàng."
        badge="Vận hành"
        tone="slate"
        stats={[
          { label: 'Tổng hóa đơn', value: isLoading ? '...' : `${invoices.length}` },
          { label: 'Tổng tiền', value: isLoading ? '...' : formatVND(totalAmount) },
          { label: 'Tổng VAT', value: isLoading ? '...' : formatVND(totalVat) },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SellerMetricCard icon={FileText} label="Hóa đơn" value={isLoading ? '...' : `${invoices.length}`} hint="Tổng số hóa đơn" tone="indigo" />
        <SellerMetricCard icon={CircleDollarSign} label="Tổng tiền" value={isLoading ? '...' : formatVND(totalAmount)} hint="Tổng giá trị hóa đơn" tone="emerald" />
        <SellerMetricCard icon={CalendarDays} label="Thuế VAT" value={isLoading ? '...' : formatVND(totalVat)} hint="Tổng thuế VAT" tone="sky" />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            {isLoading ? 'Đang tải...' : `${invoices.length} hóa đơn`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Số hóa đơn</th>
                <th className="px-5 py-3 text-left">Người mua</th>
                <th className="px-5 py-3 text-right">Tạm tính</th>
                <th className="px-5 py-3 text-right">VAT</th>
                <th className="px-5 py-3 text-right">Tổng cộng</th>
                <th className="px-5 py-3 text-left">Ngày xuất</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-4 text-sm font-mono font-medium text-slate-900">{inv.invoiceNo}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">{inv.billingName}</td>
                  <td className="px-5 py-4 text-right text-sm text-slate-700">{formatVND(inv.subtotalVnd)}</td>
                  <td className="px-5 py-4 text-right text-sm text-slate-500">{formatVND(inv.vatVnd)}</td>
                  <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">{formatVND(inv.totalVnd)}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {new Date(inv.issuedAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && invoices.length === 0 && (
            <div className="p-5">
              <SellerEmptyState
                icon={Receipt}
                title="Chưa có hóa đơn"
                description="Khi có đơn hàng được xuất hóa đơn, danh sách sẽ hiển thị tại đây."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
