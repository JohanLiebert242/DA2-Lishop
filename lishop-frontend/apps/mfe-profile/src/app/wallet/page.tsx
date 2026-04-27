'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletApi, WalletTx } from '../../lib/wallet-api';
import { AccountSidebar } from '../../components/account-sidebar';
import { formatVND } from '@lishop/shared';

const TX_TYPE_LABELS: Record<WalletTx['type'], string> = {
  TOPUP: 'Nạp tiền',
  PAYMENT: 'Thanh toán đơn hàng',
  REFUND: 'Hoàn tiền',
  WITHDRAW: 'Rút tiền',
  POINTS_CONVERSION: 'Đổi điểm tích lũy',
};

const TX_CREDIT_TYPES: WalletTx['type'][] = ['TOPUP', 'REFUND', 'POINTS_CONVERSION'];

function isCredit(type: WalletTx['type']) {
  return TX_CREDIT_TYPES.includes(type);
}

export default function WalletPage() {
  const queryClient = useQueryClient();

  const [topUpAmount, setTopUpAmount] = useState('');
  const [pointsAmount, setPointsAmount] = useState('');
  const [topUpMsg, setTopUpMsg] = useState('');
  const [pointsMsg, setPointsMsg] = useState('');

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletApi.getWallet(),
    retry: false,
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: () => walletApi.getTransactions(),
    enabled: !!wallet,
    retry: false,
  });

  const topUpMutation = useMutation({
    mutationFn: (amountVnd: number) => walletApi.topUp(amountVnd),
    onSuccess: (res) => {
      queryClient.setQueryData(['wallet'], res.wallet);
      void queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      setTopUpAmount('');
      setTopUpMsg('Nạp tiền thành công!');
      setTimeout(() => setTopUpMsg(''), 3000);
    },
    onError: (err: Error) => {
      setTopUpMsg(err.message ?? 'Nạp tiền thất bại.');
      setTimeout(() => setTopUpMsg(''), 4000);
    },
  });

  const convertMutation = useMutation({
    mutationFn: (points: number) => walletApi.convertPoints(points),
    onSuccess: (res) => {
      queryClient.setQueryData(['wallet'], res.wallet);
      void queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      setPointsAmount('');
      setPointsMsg(
        `Đổi thành công ${res.pointsConverted} điểm → ${formatVND(res.amountCredited)}!`,
      );
      setTimeout(() => setPointsMsg(''), 4000);
    },
    onError: (err: Error) => {
      setPointsMsg(err.message ?? 'Đổi điểm thất bại.');
      setTimeout(() => setPointsMsg(''), 4000);
    },
  });

  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(topUpAmount, 10);
    if (!amount || amount < 10000) return;
    topUpMutation.mutate(amount);
  };

  const handleConvertPoints = (e: React.FormEvent) => {
    e.preventDefault();
    const points = parseInt(pointsAmount, 10);
    if (!points || points < 100) return;
    convertMutation.mutate(points);
  };

  const pointsNum = parseInt(pointsAmount, 10);
  const pointsEquivalent = !isNaN(pointsNum) && pointsNum >= 100 ? pointsNum * 100 : null;

  if (walletLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex gap-7">
          <AccountSidebar activeSection="wallet" />
          <div className="flex-1 min-w-0">
            <div className="card p-8 animate-pulse">
              <div className="h-6 w-40 rounded bg-stone-100 mb-6" />
              <div className="h-24 w-full rounded-2xl bg-stone-100 mb-4" />
              <div className="h-48 w-full rounded-2xl bg-stone-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex gap-7">
        <AccountSidebar activeSection="wallet" />

        <div className="flex-1 min-w-0 space-y-6">
          {/* Balance card */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-7 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">💰</span>
              <p className="text-lg font-semibold opacity-90">Ví Lishop</p>
            </div>
            <p className="text-4xl font-bold tracking-tight">
              {wallet ? formatVND(wallet.balanceVnd) : '—'}
            </p>
            <p className="mt-2 text-sm opacity-70">Số dư khả dụng</p>
          </div>

          {/* Actions row */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Top-up form */}
            <div className="rounded-2xl bg-white border border-warm shadow-sm p-6">
              <h2 className="text-base font-bold text-stone-800 mb-4">Nạp tiền vào ví</h2>
              <form onSubmit={handleTopUp} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                    Số tiền (VND)
                  </label>
                  <input
                    type="number"
                    min={10000}
                    step={1000}
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="Tối thiểu 10.000 VND"
                    className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  {topUpAmount && parseInt(topUpAmount, 10) >= 10000 && (
                    <p className="mt-1 text-xs text-indigo-600 font-medium">
                      = {formatVND(parseInt(topUpAmount, 10))}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={topUpMutation.isPending || !topUpAmount || parseInt(topUpAmount, 10) < 10000}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {topUpMutation.isPending ? 'Đang xử lý...' : 'Nạp tiền'}
                </button>
                {topUpMsg && (
                  <p
                    className={`text-xs font-medium ${
                      topUpMsg.includes('thành công') ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {topUpMsg}
                  </p>
                )}
              </form>
            </div>

            {/* Convert points form */}
            <div className="rounded-2xl bg-white border border-warm shadow-sm p-6">
              <h2 className="text-base font-bold text-stone-800 mb-4">Đổi điểm tích lũy</h2>
              <form onSubmit={handleConvertPoints} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                    Số điểm (tối thiểu 100)
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={1}
                    value={pointsAmount}
                    onChange={(e) => setPointsAmount(e.target.value)}
                    placeholder="Nhập số điểm muốn đổi"
                    className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  />
                  {pointsEquivalent !== null && (
                    <p className="mt-1 text-xs text-violet-600 font-medium">
                      = {formatVND(pointsEquivalent)}{' '}
                      <span className="text-stone-400">(1 điểm = 100 VND)</span>
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={
                    convertMutation.isPending ||
                    !pointsAmount ||
                    parseInt(pointsAmount, 10) < 100
                  }
                  className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {convertMutation.isPending ? 'Đang xử lý...' : 'Đổi điểm'}
                </button>
                {pointsMsg && (
                  <p
                    className={`text-xs font-medium ${
                      pointsMsg.includes('thành công') ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {pointsMsg}
                  </p>
                )}
              </form>
            </div>
          </div>

          {/* Transaction history */}
          <div className="rounded-2xl bg-white border border-warm shadow-sm overflow-hidden">
            <div className="border-b border-stone-100 px-6 py-4">
              <h2 className="text-base font-bold text-stone-800">Lịch sử giao dịch</h2>
            </div>

            {txLoading ? (
              <div className="p-6 animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded-lg bg-stone-100" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <span className="text-4xl">📭</span>
                <p className="mt-3 text-sm text-stone-500">Chưa có giao dịch nào.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide">
                      <th className="px-6 py-3">Thời gian</th>
                      <th className="px-6 py-3">Loại giao dịch</th>
                      <th className="px-6 py-3 text-right">Số tiền</th>
                      <th className="px-6 py-3 text-right">Số dư sau</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {transactions.map((tx) => {
                      const credit = isCredit(tx.type);
                      return (
                        <tr key={tx.id} className="hover:bg-stone-50 transition-colors">
                          <td className="px-6 py-3.5 text-stone-500 whitespace-nowrap">
                            {new Date(tx.createdAt).toLocaleString('vi-VN', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="font-medium text-stone-700">
                              {TX_TYPE_LABELS[tx.type]}
                            </span>
                            {tx.description && (
                              <p className="text-xs text-stone-400 mt-0.5">{tx.description}</p>
                            )}
                          </td>
                          <td
                            className={`px-6 py-3.5 text-right font-semibold whitespace-nowrap ${
                              credit ? 'text-emerald-600' : 'text-red-500'
                            }`}
                          >
                            {credit ? '+' : '-'}
                            {formatVND(Math.abs(tx.amountVnd))}
                          </td>
                          <td className="px-6 py-3.5 text-right text-stone-600 whitespace-nowrap">
                            {formatVND(tx.balanceAfter)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
