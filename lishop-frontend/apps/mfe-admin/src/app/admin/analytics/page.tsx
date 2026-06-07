'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, BarChart3, BrainCircuit, PackageSearch, Sparkles, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatVND } from '@lishop/shared';
import { adminApi } from '../../../lib/admin-api';
import { AdminEmptyState } from '../_components/admin-empty-state';
import { AdminMetricCard } from '../_components/admin-metric-card';
import { AdminPageHeader } from '../_components/admin-page-header';

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

  const insightsMutation = useMutation({
    mutationFn: () => adminApi.getAiAnalyticsInsights(30),
  });

  const kpis = [
    { label: 'Doanh thu 30 ngay', value: analytics ? formatVND(analytics.summary.revenueVnd) : '...' },
    { label: 'Don hang 30 ngay', value: analytics ? analytics.summary.orderCount.toLocaleString('vi-VN') : '...' },
    { label: 'Gia tri don TB', value: analytics ? formatVND(analytics.summary.averageOrderValueVnd) : '...' },
    { label: 'Khach moi', value: analytics ? analytics.summary.newUsers.toLocaleString('vi-VN') : '...' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={BarChart3}
        title="Phan tich"
        description="Khung bao cao chi tiet cho doanh thu, top san pham, trang thai don va AI insights. Trang nay duoc toi uu de demo nhanh tinh hinh kinh doanh va ra quyet dinh."
        badge="Analytics"
        tone="sky"
        stats={[
          { label: 'Doanh thu', value: isLoading ? '...' : kpis[0]!.value },
          { label: 'Don hang', value: isLoading ? '...' : kpis[1]!.value },
          { label: 'AOV', value: isLoading ? '...' : kpis[2]!.value },
          { label: 'Khach moi', value: isLoading ? '...' : kpis[3]!.value },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard icon={Sparkles} label={kpis[0]!.label} value={isLoading ? '...' : kpis[0]!.value} hint="Revenue snapshot" tone="emerald" />
        <AdminMetricCard icon={BarChart3} label={kpis[1]!.label} value={isLoading ? '...' : kpis[1]!.value} hint="Don hang trong ky" tone="indigo" />
        <AdminMetricCard icon={Users} label={kpis[3]!.label} value={isLoading ? '...' : kpis[3]!.value} hint="Tang truong tai khoan" tone="sky" />
        <AdminMetricCard
          icon={PackageSearch}
          label="Ton kho thap"
          value={analytics ? analytics.lowStockProducts.length.toLocaleString('vi-VN') : '...'}
          hint="SKU can bo sung"
          tone="amber"
        />
      </div>

      <section
        data-testid="admin-analytics-ai"
        className="rounded-[28px] border border-sky-200/80 bg-white p-5 shadow-[0_18px_48px_-36px_rgba(14,165,233,0.4)]"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h2 className="text-sm font-semibold text-gray-900">AI insights</h2>
            <p className="mt-1 text-xs text-gray-500">Phan tich nhanh tu du lieu 30 ngay gan nhat.</p>
          </div>
          {insightsMutation.data?.fallback && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
              fallback
            </span>
          )}
          <button
            type="button"
            data-testid="admin-analytics-ai-run"
            onClick={() => insightsMutation.mutate()}
            disabled={insightsMutation.isPending || isLoading}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {insightsMutation.isPending ? 'Dang phan tich...' : insightsMutation.data ? 'Lam moi' : 'Tao insight'}
          </button>
        </div>

        {insightsMutation.isPending && (
          <p className="mt-4 rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-800">Dang phan tich...</p>
        )}

        {insightsMutation.data && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-gray-200 p-3">
              <h3 className="text-xs font-semibold uppercase text-gray-500">Highlights</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {insightsMutation.data.highlights.map((item, index) => (
                  <li key={`highlight-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-gray-200 p-3">
              <h3 className="text-xs font-semibold uppercase text-gray-500">Risks</h3>
              {insightsMutation.data.risks.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {insightsMutation.data.risks.map((item, index) => (
                    <li key={`risk-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-gray-400">Chua co rui ro noi bat.</p>
              )}
            </div>
            <div className="rounded-md border border-gray-200 p-3 lg:col-span-2">
              <h3 className="text-xs font-semibold uppercase text-gray-500">Actions</h3>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {insightsMutation.data.actions.map((action, index) => (
                  <div key={`action-${index}`} className="rounded-md bg-gray-50 p-3">
                    <p className="text-sm font-semibold text-gray-900">{action.title}</p>
                    <p className="mt-1 text-xs text-gray-600">{action.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
            {insightsMutation.data.questions.length > 0 && (
              <div className="rounded-md border border-gray-200 p-3 lg:col-span-2">
                <h3 className="text-xs font-semibold uppercase text-gray-500">Questions</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {insightsMutation.data.questions.map((question, index) => (
                    <li key={`question-${index}`}>{question}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Doanh thu 30 ngay gan nhat</h2>
        {isLoading ? (
          <p className="py-8 text-center text-sm text-gray-400">Dang tai...</p>
        ) : !analytics || analytics.dailyRevenue.length === 0 ? (
          <AdminEmptyState
            icon={BarChart3}
            title="Chua co du lieu doanh thu"
            description="Khi dashboard nhan du lieu giao dich, bieu do doanh thu se xuat hien o day de so sanh tung ngay."
            tone="indigo"
          />
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
        <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
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

        <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
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

      <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">San pham sap het hang</h2>
            <p className="text-xs text-gray-500">Theo doi nhanh cac SKU can bo sung trong dashboard.</p>
          </div>
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
            <div className="p-4">
              <AdminEmptyState
                icon={BrainCircuit}
                title="Ton kho dang an toan"
                description="Chua co san pham nao roi vao nguong canh bao, nen ban co the tap trung vao phan tich va tang truong."
                tone="emerald"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
