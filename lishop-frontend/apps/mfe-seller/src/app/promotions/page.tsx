'use client';

import { useQuery } from '@tanstack/react-query';
import { Megaphone, Tag, AlertCircle } from 'lucide-react';
import { sellerApi } from '@/lib/seller-api';
import { SellerPageHeader } from '../_components/seller-page-header';
import { SellerMetricCard } from '../_components/seller-metric-card';
import { SellerEmptyState } from '../_components/seller-empty-state';

export default function PromotionsPage() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['seller-products'],
    queryFn: () => sellerApi.getMyProducts({ limit: 100 }),
  });

  const items = products?.items ?? [];
  const totalProducts = items.length;
  const activeProducts = items.filter((p) => p.stock > 0).length;
  const avgRating = items.length > 0
    ? items.reduce((s, p) => s + p.averageRating, 0) / items.length
    : 0;

  return (
    <div className="space-y-6">
      <SellerPageHeader
        icon={Megaphone}
        title="Khuyến mãi"
        description="Quản lý các chương trình khuyến mãi, giảm giá và ưu đãi cho sản phẩm của cửa hàng."
        badge="Vận hành"
        tone="pink"
        stats={[
          { label: 'Tổng sản phẩm', value: isLoading ? '...' : `${totalProducts}` },
          { label: 'Đang bán', value: isLoading ? '...' : `${activeProducts}` },
          { label: 'Đánh giá TB', value: isLoading ? '...' : avgRating > 0 ? avgRating.toFixed(1) : '—' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <SellerMetricCard
          icon={Tag}
          label="Sản phẩm đang bán"
          value={isLoading ? '...' : `${activeProducts}`}
          hint="Sản phẩm còn hàng trong cửa hàng"
          tone="pink"
        />
        <SellerMetricCard
          icon={AlertCircle}
          label="Sản phẩm hết hàng"
          value={isLoading ? '...' : `${items.filter((p) => p.stock === 0).length}`}
          hint="Cần nhập thêm hàng"
          tone="amber"
        />
      </div>

      <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <h2 className="text-lg font-semibold text-slate-950">Danh sách sản phẩm</h2>
        <p className="mt-1 text-sm text-slate-500">Xem nhanh thông tin giá và tồn kho để lên kế hoạch khuyến mãi.</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Sản phẩm</th>
                <th className="px-4 py-3 text-left">Giá (VND)</th>
                <th className="px-4 py-3 text-left">Giá (USD)</th>
                <th className="px-4 py-3 text-left">Tồn kho</th>
                <th className="px-4 py-3 text-left">Đánh giá</th>
              </tr>
            </thead>
            <tbody>
              {items.map((product) => (
                <tr key={product.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{product.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{product.priceVnd.toLocaleString('vi-VN')}₫</td>
                  <td className="px-4 py-3 text-sm text-slate-500">${(product.priceUsd / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${product.stock <= 10 ? 'text-red-600' : 'text-slate-900'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    ★ {product.averageRating.toFixed(1)} ({product.reviewCount})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && items.length === 0 && (
            <div className="py-8">
              <SellerEmptyState
                icon={Megaphone}
                title="Chưa có sản phẩm"
                description="Thêm sản phẩm để bắt đầu tạo khuyến mãi."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
