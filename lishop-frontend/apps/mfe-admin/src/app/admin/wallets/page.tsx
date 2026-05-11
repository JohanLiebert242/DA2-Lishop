'use client';

import { useQuery } from '@tanstack/react-query';
import { formatVND } from '@lishop/shared';
import { adminApi, AdminWallet } from '../../../lib/admin-api';

export default function WalletsPage() {
  const { data: adminWallets = [], isLoading } = useQuery({
    queryKey: ['admin-wallets'],
    queryFn: () => adminApi.getWallets(),
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h2 className="text-sm font-semibold text-gray-900">
          {isLoading ? 'Đang tải...' : `${adminWallets.length} ví người dùng`}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Email khách hàng</th>
              <th className="px-4 py-2 text-left">Họ tên</th>
              <th className="px-4 py-2 text-left">Số dư (VND)</th>
              <th className="px-4 py-2 text-left">Cập nhật lần cuối</th>
            </tr>
          </thead>
          <tbody>
            {adminWallets.map((wallet: AdminWallet) => (
              <tr key={wallet.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-700">{wallet.user.email}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {wallet.user.firstName && wallet.user.lastName
                    ? `${wallet.user.firstName} ${wallet.user.lastName}`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {formatVND(wallet.balanceVnd)}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(wallet.updatedAt).toLocaleDateString('vi-VN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && adminWallets.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có ví nào.</p>
        )}
      </div>
    </div>
  );
}
