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
  PENDING: 'Chờ xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Hoàn tiền',
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
    { label: 'Doanh thu 30 ngày', value: analytics ? formatVND(analytics.summary.revenueVnd) : '...' },
    { label: 'Đơn hàng 30 ngày', value: analytics ? analytics.summary.orderCount.toLocaleString('vi-VN') : '...' },
    { label: 'Giá trị đơn TB', value: analytics ? formatVND(analytics.summary.averageOrderValueVnd) : '...' },
    { label: 'Khách mới', value: analytics ? analytics.summary.newUsers.toLocaleString('vi-VN') : '...' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={BarChart3}
        title="Phân tích"
        description="Khung báo cáo chi tiết cho doanh thu, sản phẩm nổi bật, trạng thái đơn hàng và gợi ý AI. Trang này được tối ưu để demo nhanh tình hình kinh doanh và ra quyết định."
        badge="Phân tích dữ liệu"
        tone="sky"
        stats={[
          { label: 'Doanh thu', value: isLoading ? '...' : kpis[0]!.value },
          { label: 'Đơn hàng', value: isLoading ? '...' : kpis[1]!.value },
          { label: 'Đơn TB', value: isLoading ? '...' : kpis[2]!.value },
          { label: 'Khách mới', value: isLoading ? '...' : kpis[3]!.value },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard icon={Sparkles} label={kpis[0]!.label} value={isLoading ? '...' : kpis[0]!.value} hint="Ảnh chụp nhanh doanh thu" tone="emerald" />
        <AdminMetricCard icon={BarChart3} label={kpis[1]!.label} value={isLoading ? '...' : kpis[1]!.value} hint="Đơn hàng trong kỳ" tone="indigo" />
        <AdminMetricCard icon={Users} label={kpis[3]!.label} value={isLoading ? '...' : kpis[3]!.value} hint="Tăng trưởng tài khoản" tone="sky" />
        <AdminMetricCard
          icon={PackageSearch}
          label="Tồn kho thấp"
          value={analytics ? analytics.lowStockProducts.length.toLocaleString('vi-VN') : '...'}
          hint="Mã hàng cần bổ sung"
          tone="amber"
        />
      </div>

      <section
        data-testid="admin-analytics-ai"
        className="rounded-[28px] border border-sky-200/80 bg-white p-5 shadow-[0_18px_48px_-36px_rgba(14,165,233,0.4)]"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h2 className="text-sm font-semibold text-gray-900">Gợi ý AI</h2>
            <p className="mt-1 text-xs text-gray-500">Phân tích nhanh từ dữ liệu 30 ngày gần nhất.</p>
          </div>
          {insightsMutation.data?.fallback && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
              Chế độ dự phòng
            </span>
          )}
          <button
            type="button"
            data-testid="admin-analytics-ai-run"
            onClick={() => insightsMutation.mutate()}
            disabled={insightsMutation.isPending || isLoading}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {insightsMutation.isPending ? 'Đang phân tích...' : insightsMutation.data ? 'Làm mới' : 'Tạo gợi ý'}
          </button>
        </div>

        {insightsMutation.isPending && (
          <p className="mt-4 rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-800">Đang phân tích...</p>
        )}

        {insightsMutation.data && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-gray-200 p-3">
              <h3 className="text-xs font-semibold uppercase text-gray-500">Điểm nổi bật</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {insightsMutation.data.highlights.map((item, index) => (
                  <li key={`highlight-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-gray-200 p-3">
              <h3 className="text-xs font-semibold uppercase text-gray-500">Rủi ro</h3>
              {insightsMutation.data.risks.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {insightsMutation.data.risks.map((item, index) => (
                    <li key={`risk-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-gray-400">Chưa có rủi ro nổi bật.</p>
              )}
            </div>
            <div className="rounded-md border border-gray-200 p-3 lg:col-span-2">
              <h3 className="text-xs font-semibold uppercase text-gray-500">Hành động đề xuất</h3>
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
                <h3 className="text-xs font-semibold uppercase text-gray-500">Câu hỏi cần làm rõ</h3>
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
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Doanh thu 30 ngày gần nhất</h2>
        {isLoading ? (
          <p className="py-8 text-center text-sm text-gray-400">Đang tải...</p>
        ) : !analytics || analytics.dailyRevenue.length === 0 ? (
          <AdminEmptyState
            icon={BarChart3}
            title="Chưa có dữ liệu doanh thu"
            description="Khi bảng điều khiển nhận dữ liệu giao dịch, biểu đồ doanh thu sẽ xuất hiện ở đây để so sánh từng ngày."
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
                labelFormatter={(label: unknown) => `Ngày ${String(label)}`}
              />
              <Bar dataKey="amount" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
          <div className="border-b px-4 py-3">
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
            <h2 className="text-sm font-semibold text-gray-900">Trạng thái đơn hàng</h2>
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
              <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có dữ liệu.</p>
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
            <h2 className="text-sm font-semibold text-gray-900">Sản phẩm sắp hết hàng</h2>
            <p className="text-xs text-gray-500">Theo dõi nhanh các mã hàng cần bổ sung trong bảng điều khiển.</p>
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
                title="Tồn kho đang an toàn"
                description="Chưa có sản phẩm nào rơi vào ngưỡng cảnh báo, nên bạn có thể tập trung vào phân tích và tăng trưởng."
                tone="emerald"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
