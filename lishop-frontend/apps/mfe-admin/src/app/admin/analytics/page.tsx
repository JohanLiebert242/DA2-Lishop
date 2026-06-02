'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatVND } from '@lishop/shared';
import { adminApi } from '../../../lib/admin-api';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Cho xac nhan',
  PROCESSING: 'Dang xu ly',
  SHIPPED: 'Dang giao',
  DELIVERED: 'Da giao',
  CANCELLED: 'Da huy',
  REFUNDED: 'Hoan tien',
};

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.getAnalytics(),
  });

  const kpis = [
    { label: 'Doanh thu 30 ngay', value: analytics ? formatVND(analytics.summary.revenueVnd) : '...' },
    { label: 'Don hang 30 ngay', value: analytics ? analytics.summary.orderCount.toLocaleString('vi-VN') : '...' },
    { label: 'Gia tri don TB', value: analytics ? formatVND(analytics.summary.averageOrderValueVnd) : '...' },
    { label: 'Khach moi', value: analytics ? analytics.summary.newUsers.toLocaleString('vi-VN') : '...' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{item.label}</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{isLoading ? '...' : item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Doanh thu 30 ngay gan nhat</h2>
        {isLoading ? (
          <p className="py-8 text-center text-sm text-gray-400">Dang tai...</p>
        ) : !analytics || analytics.dailyRevenue.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Chua co du lieu doanh thu.</p>
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
                labelFormatter={(label: unknown) => `Ngay ${String(label)}`}
              />
              <Bar dataKey="amount" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Top 5 san pham theo doanh thu</h2>
          </div>
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">Dang tai...</p>
          ) : !analytics || analytics.topProducts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">Chua co du lieu.</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">San pham</th>
                  <th className="px-4 py-2 text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topProducts.map((product, index) => (
                  <tr key={product.productId} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{product.productName}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {formatVND(product.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Trang thai don hang</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {(analytics?.orderStatusBreakdown ?? []).map((item) => (
              <div key={item.status} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-700">{STATUS_LABELS[item.status] ?? item.status}</span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                  {item.count}
                </span>
              </div>
            ))}
            {!isLoading && (!analytics || analytics.orderStatusBreakdown.length === 0) && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Chua co du lieu.</p>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">San pham sap het hang</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {(analytics?.lowStockProducts ?? []).map((product) => (
            <div key={product.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{product.name}</p>
                <p className="text-xs text-gray-400">{product.slug}</p>
              </div>
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                {product.stock}
              </span>
            </div>
          ))}
          {!isLoading && (!analytics || analytics.lowStockProducts.length === 0) && (
            <p className="px-4 py-8 text-center text-sm text-gray-400">Khong co san pham ton kho thap.</p>
          )}
        </div>
      </div>
    </div>
  );
}
