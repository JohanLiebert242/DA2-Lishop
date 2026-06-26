'use client';

import { useQuery } from '@tanstack/react-query';
import { Wallet, CircleDollarSign, ArrowUpRight, ArrowDownRight, Banknote } from 'lucide-react';
import { formatVND } from '@lishop/shared';
import { sellerApi } from '@/lib/seller-api';
import { SellerPageHeader } from '../_components/seller-page-header';
import { SellerMetricCard } from '../_components/seller-metric-card';
import { SellerEmptyState } from '../_components/seller-empty-state';

export default function WalletsPage() {
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['my-wallet'],
    queryFn: () => sellerApi.getMyWallet(),
  });

  const { data: transactionsData, isLoading: txLoading } = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: () => sellerApi.getWalletTransactions({ limit: 50 }),
  });

  const isLoading = walletLoading || txLoading;
  const transactions = transactionsData?.items ?? [];

  const totalIn = transactions
    .filter((t) => t.amountVnd > 0)
    .reduce((s, t) => s + t.amountVnd, 0);

  const totalOut = transactions
    .filter((t) => t.amountVnd < 0)
    .reduce((s, t) => s + Math.abs(t.amountVnd), 0);

  const typeLabels: Record<string, string> = {
    TOPUP: 'Nạp tiền',
    PAYMENT: 'Thanh toán',
    REFUND: 'Hoàn tiền',
    WITHDRAW: 'Rút tiền',
    POINTS_CONVERSION: 'Đổi điểm',
  };

  const typeIcons: Record<string, typeof ArrowUpRight> = {
    TOPUP: ArrowUpRight,
    PAYMENT: ArrowDownRight,
    REFUND: ArrowUpRight,
    WITHDRAW: ArrowDownRight,
    POINTS_CONVERSION: ArrowUpRight,
  };

  const typeColors: Record<string, string> = {
    TOPUP: 'text-emerald-600 bg-emerald-100',
    PAYMENT: 'text-red-600 bg-red-100',
    REFUND: 'text-blue-600 bg-blue-100',
    WITHDRAW: 'text-amber-600 bg-amber-100',
    POINTS_CONVERSION: 'text-purple-600 bg-purple-100',
  };

  return (
    <div className="space-y-6">
      <SellerPageHeader
        icon={Wallet}
        title="Ví của tôi"
        description="Quản lý số dư ví, xem lịch sử giao dịch và theo dõi dòng tiền từ cửa hàng."
        badge="Tài chính"
        tone="emerald"
        stats={[
          { label: 'Số dư hiện tại', value: walletLoading ? '...' : wallet ? formatVND(wallet.balanceVnd) : '—' },
          { label: 'Tổng thu', value: txLoading ? '...' : formatVND(totalIn) },
          { label: 'Tổng chi', value: txLoading ? '...' : formatVND(totalOut) },
          { label: 'Giao dịch', value: txLoading ? '...' : `${transactions.length}` },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="col-span-1 md:col-span-2 rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Banknote className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-600">Số dư ví</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">
                {walletLoading ? '...' : wallet ? formatVND(wallet.balanceVnd) : '—'}
              </p>
              <p className="mt-2 text-sm text-slate-500">Tổng số dư khả dụng trong ví Lishop</p>
            </div>
          </div>
        </div>
        <SellerMetricCard icon={CircleDollarSign} label="Tổng thu" value={txLoading ? '...' : formatVND(totalIn)} hint="Tổng tiền đã nhận" tone="emerald" />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            {txLoading ? 'Đang tải...' : `${transactions.length} giao dịch`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Loại</th>
                <th className="px-5 py-3 text-left">Mô tả</th>
                <th className="px-5 py-3 text-right">Số tiền</th>
                <th className="px-5 py-3 text-right">Số dư sau</th>
                <th className="px-5 py-3 text-left">Ngày</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const Icon = typeIcons[tx.type] ?? ArrowDownRight;
                const colorClass = typeColors[tx.type] ?? 'text-gray-600 bg-gray-100';

                return (
                  <tr key={tx.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {typeLabels[tx.type] ?? tx.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">{tx.description ?? '—'}</td>
                    <td className={`px-5 py-4 text-right text-sm font-semibold ${tx.amountVnd > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tx.amountVnd > 0 ? '+' : ''}{formatVND(tx.amountVnd)}
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-slate-700">{formatVND(tx.balanceAfter)}</td>
                    <td className="px-5 py-4 text-sm text-slate-500">
                      {new Date(tx.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!txLoading && transactions.length === 0 && (
            <div className="p-5">
              <SellerEmptyState
                icon={Wallet}
                title="Chưa có giao dịch"
                description="Lịch sử giao dịch sẽ hiển thị khi có biến động số dư."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
