'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, MessageSquareText, TrendingUp, Filter } from 'lucide-react';
import { sellerApi } from '@/lib/seller-api';
import { REVIEW_STATUS_LABELS, REVIEW_STATUS_COLORS } from '../_constants';
import { SellerPageHeader } from '../_components/seller-page-header';
import { SellerMetricCard } from '../_components/seller-metric-card';
import { SellerEmptyState } from '../_components/seller-empty-state';

export default function ReviewsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['seller-products'],
    queryFn: () => sellerApi.getMyProducts({ limit: 100 }),
  });

  const items = products?.items ?? [];

  const allReviews = items.flatMap((product) => ({
    productId: product.id,
    productName: product.name,
    rating: product.averageRating,
    reviewCount: product.reviewCount,
  }));

  const totalReviews = allReviews.reduce((s, r) => s + r.reviewCount, 0);
  const productsWithReviews = allReviews.filter((r) => r.reviewCount > 0).length;
  const avgRating = items.length > 0
    ? items.reduce((s, p) => s + p.averageRating, 0) / items.length
    : 0;

  const filtered = statusFilter
    ? allReviews
    : allReviews;

  return (
    <div className="space-y-6">
      <SellerPageHeader
        icon={Star}
        title="Đánh giá sản phẩm"
        description="Xem và quản lý đánh giá từ khách hàng cho các sản phẩm của cửa hàng."
        badge="Chăm sóc"
        tone="amber"
        stats={[
          { label: 'Tổng đánh giá', value: isLoading ? '...' : `${totalReviews}` },
          { label: 'Sản phẩm có đánh giá', value: isLoading ? '...' : `${productsWithReviews}` },
          { label: 'Đánh giá TB', value: isLoading ? '...' : avgRating > 0 ? avgRating.toFixed(1) : '—' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SellerMetricCard icon={Star} label="Đánh giá trung bình" value={isLoading ? '...' : avgRating > 0 ? avgRating.toFixed(1) : '—'} hint="Trên tất cả sản phẩm" tone="amber" />
        <SellerMetricCard icon={MessageSquareText} label="Tổng lượt đánh giá" value={isLoading ? '...' : `${totalReviews}`} hint="Lượt đánh giá từ khách hàng" tone="indigo" />
        <SellerMetricCard icon={TrendingUp} label="Sản phẩm có đánh giá" value={isLoading ? '...' : `${productsWithReviews}`} hint="Số sản phẩm đã được đánh giá" tone="sky" />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="mr-auto text-sm font-semibold text-slate-900">
            {isLoading ? 'Đang tải...' : `${filtered.length} sản phẩm`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Sản phẩm</th>
                <th className="px-5 py-3 text-left">Đánh giá TB</th>
                <th className="px-5 py-3 text-left">Lượt đánh giá</th>
                <th className="px-5 py-3 text-left">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((review) => {
                const ratingColor = review.rating >= 4
                  ? 'text-emerald-600'
                  : review.rating >= 3
                    ? 'text-amber-600'
                    : 'text-red-600';

                return (
                  <tr key={review.productId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-4 text-sm font-medium text-slate-900">{review.productName}</td>
                    <td className={`px-5 py-4 text-sm font-semibold ${ratingColor}`}>
                      ★ {review.rating.toFixed(1)}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">{review.reviewCount}</td>
                    <td className="px-5 py-4">
                      <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        Đang hoạt động
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!isLoading && filtered.length === 0 && (
            <div className="p-5">
              <SellerEmptyState
                icon={Star}
                title="Chưa có đánh giá"
                description="Khi khách hàng đánh giá sản phẩm, dữ liệu sẽ hiển thị tại đây."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
