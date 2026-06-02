'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletApi, BankTransferInfo, WalletTopupRequest, WalletTx } from '../../lib/wallet-api';
import { AccountSidebar } from '../../components/account-sidebar';
import { formatVND } from '@lishop/shared';

const TX_TYPE_LABELS: Record<WalletTx['type'], string> = {
  TOPUP: 'Nạp tiền',
  PAYMENT: 'Thanh toán đơn hàng',
  REFUND: 'Hoàn tiền',
  WITHDRAW: 'Rút tiền',
  POINTS_CONVERSION: 'Đổi điểm tích lũy',
};

const TOPUP_STATUS_LABELS: Record<WalletTopupRequest['status'], string> = {
  PENDING: 'Chờ xác nhận',
  APPROVED: 'Đã cộng ví',
  REJECTED: 'Từ chối',
};

const TOPUP_STATUS_CLASS: Record<WalletTopupRequest['status'], string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
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
  const [bankTransfer, setBankTransfer] = useState<BankTransferInfo | null>(null);

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

  const { data: topupRequests = [], isLoading: topupsLoading } = useQuery({
    queryKey: ['wallet-topup-requests'],
    queryFn: () => walletApi.getTopupRequests(),
    enabled: !!wallet,
    retry: false,
  });

  const topUpMutation = useMutation({
    mutationFn: (amountVnd: number) => walletApi.topUp(amountVnd),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['wallet-topup-requests'] });
      setTopUpAmount('');
      setBankTransfer(res.bankTransfer);
      setTopUpMsg('Đã tạo yêu cầu nạp tiền. Vui lòng chuyển khoản đúng nội dung để admin xác nhận.');
      setTimeout(() => setTopUpMsg(''), 6000);
    },
    onError: (err: Error) => {
      setTopUpMsg(err.message ?? 'Tạo yêu cầu nạp tiền thất bại.');
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
          <div className="min-w-0 flex-1">
            <div className="card animate-pulse p-8">
              <div className="mb-6 h-6 w-40 rounded bg-stone-100" />
              <div className="mb-4 h-24 w-full rounded-2xl bg-stone-100" />
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

        <div className="min-w-0 flex-1 space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-7 text-white shadow-lg">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-3xl">💰</span>
              <p className="text-lg font-semibold opacity-90">Ví Lishop</p>
            </div>
            <p className="text-4xl font-bold tracking-tight">
              {wallet ? formatVND(wallet.balanceVnd) : '—'}
            </p>
            <p className="mt-2 text-sm opacity-70">Số dư khả dụng, chỉ tăng sau khi chuyển khoản được xác nhận</p>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div className="rounded-2xl border border-warm bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-base font-bold text-stone-800">Nạp tiền bằng chuyển khoản</h2>
              <p className="mb-4 text-sm text-muted">
                Tạo yêu cầu nạp tiền, chuyển khoản đúng số tiền và nội dung. Admin sẽ xác nhận trước khi cộng vào ví.
              </p>
              <form onSubmit={handleTopUp} className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-500">
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
                    <p className="mt-1 text-xs font-medium text-indigo-600">
                      = {formatVND(parseInt(topUpAmount, 10))}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={topUpMutation.isPending || !topUpAmount || parseInt(topUpAmount, 10) < 10000}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {topUpMutation.isPending ? 'Đang tạo yêu cầu...' : 'Tạo yêu cầu chuyển khoản'}
                </button>
                {topUpMsg && (
                  <p
                    className={`text-xs font-medium ${
                      topUpMsg.includes('Đã tạo') ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {topUpMsg}
                  </p>
                )}
              </form>

              {bankTransfer && (
                <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <p className="text-sm font-black text-indigo-900">Thông tin chuyển khoản</p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Ngân hàng</dt>
                      <dd className="font-bold text-stone-900">{bankTransfer.bankName}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Số tài khoản</dt>
                      <dd className="font-mono font-bold text-stone-900">{bankTransfer.bankAccountNumber}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Chủ tài khoản</dt>
                      <dd className="font-bold text-stone-900">{bankTransfer.bankAccountName}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Số tiền</dt>
                      <dd className="font-bold text-indigo-700">{formatVND(bankTransfer.amountVnd)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Nội dung chuyển khoản</dt>
                      <dd className="mt-1 rounded-xl bg-white px-3 py-2 font-mono text-base font-black text-indigo-700">
                        {bankTransfer.transferCode}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-warm bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-bold text-stone-800">Đổi điểm tích lũy</h2>
              <form onSubmit={handleConvertPoints} className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-stone-500">
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
                    <p className="mt-1 text-xs font-medium text-violet-600">
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
                  className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
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

          <div className="rounded-2xl border border-warm bg-white shadow-sm">
            <div className="border-b border-stone-100 px-6 py-4">
              <h2 className="text-base font-bold text-stone-800">Yêu cầu nạp tiền</h2>
            </div>
            {topupsLoading ? (
              <div className="p-6 text-sm text-muted">Đang tải yêu cầu nạp...</div>
            ) : topupRequests.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-muted">Chưa có yêu cầu nạp tiền nào.</div>
            ) : (
              <div className="divide-y divide-stone-100">
                {topupRequests.map((request) => (
                  <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                    <div>
                      <p className="font-mono text-sm font-bold text-stone-900">{request.transferCode}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {new Date(request.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                      {request.adminNote && <p className="mt-1 text-xs text-stone-500">Ghi chú: {request.adminNote}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-indigo-700">{formatVND(request.amountVnd)}</p>
                      <span className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${TOPUP_STATUS_CLASS[request.status]}`}>
                        {TOPUP_STATUS_LABELS[request.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-warm bg-white shadow-sm">
            <div className="border-b border-stone-100 px-6 py-4">
              <h2 className="text-base font-bold text-stone-800">Lịch sử giao dịch</h2>
            </div>

            {txLoading ? (
              <div className="animate-pulse space-y-3 p-6">
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
                    <tr className="bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
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
                        <tr key={tx.id} className="transition-colors hover:bg-stone-50">
                          <td className="whitespace-nowrap px-6 py-3.5 text-stone-500">
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
                              <p className="mt-0.5 text-xs text-stone-400">{tx.description}</p>
                            )}
                          </td>
                          <td
                            className={`whitespace-nowrap px-6 py-3.5 text-right font-semibold ${
                              credit ? 'text-emerald-600' : 'text-red-500'
                            }`}
                          >
                            {credit ? '+' : '-'}
                            {formatVND(Math.abs(tx.amountVnd))}
                          </td>
                          <td className="whitespace-nowrap px-6 py-3.5 text-right text-stone-600">
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
