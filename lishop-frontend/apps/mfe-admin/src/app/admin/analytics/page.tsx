'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatVND } from '@lishop/shared';
import { adminApi } from '../../../lib/admin-api';

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.getAnalytics(),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Doanh thu 30 ngày gần nhất</h2>
        {isLoading ? (
          <p className="py-8 text-center text-sm text-gray-400">Đang tải...</p>
        ) : !analytics || analytics.dailyRevenue.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Chưa có dữ liệu doanh thu.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={analytics.dailyRevenue} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(d: unknown) => String(d).slice(5)}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v: unknown) => `${(Number(v) / 1_000_000).toFixed(1)}tr`}
                width={50}
              />
              <Tooltip
                formatter={(value: unknown) => [formatVND(Number(value)), 'Doanh thu']}
                labelFormatter={(label: unknown) => `Ngày ${String(label)}`}
              />
              <Bar dataKey="amount" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold text-gray-900">Top 5 sản phẩm theo doanh thu</h2>
        </div>
        {isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Đang tải...</p>
        ) : !analytics || analytics.topProducts.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có dữ liệu.</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Sản phẩm</th>
                <th className="px-4 py-2 text-right">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {analytics.topProducts.map((p, i) => (
                <tr key={p.productId} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{p.productName}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                    {formatVND(p.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
