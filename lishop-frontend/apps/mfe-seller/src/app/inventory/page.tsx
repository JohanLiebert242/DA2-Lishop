'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Boxes, Package, AlertTriangle, Search } from 'lucide-react';
import { sellerApi } from '@/lib/seller-api';
import { SellerPageHeader } from '../_components/seller-page-header';
import { SellerMetricCard } from '../_components/seller-metric-card';
import { SellerEmptyState } from '../_components/seller-empty-state';

export default function InventoryPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['seller-products'],
    queryFn: () => sellerApi.getMyProducts({ limit: 100 }),
  });

  const products = data?.items ?? [];
  const filtered = search.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()))
    : products;

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStockCount = products.filter((p) => p.stock <= 10).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  return (
    <div className="space-y-6">
      <SellerPageHeader
        icon={Boxes}
        title="Kho hàng"
        description="Quản lý tồn kho, theo dõi sản phẩm sắp hết và đảm bảo hàng hóa luôn sẵn sàng."
        badge="Vận hành"
        tone="emerald"
        stats={[
          { label: 'Tổng tồn kho', value: isLoading ? '...' : `${totalStock}` },
          { label: 'Sản phẩm', value: isLoading ? '...' : `${products.length}` },
          { label: 'Sắp hết hàng', value: isLoading ? '...' : `${lowStockCount}` },
          { label: 'Hết hàng', value: isLoading ? '...' : `${outOfStockCount}` },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SellerMetricCard icon={Package} label="Tổng sản phẩm" value={isLoading ? '...' : `${products.length}`} hint="Danh mục sản phẩm trong cửa hàng" tone="indigo" />
        <SellerMetricCard icon={AlertTriangle} label="Sắp hết hàng" value={isLoading ? '...' : `${lowStockCount}`} hint="Sản phẩm có tồn kho ≤ 10" tone="amber" />
        <SellerMetricCard icon={Boxes} label="Tổng tồn kho" value={isLoading ? '...' : `${totalStock}`} hint="Tổng số lượng hàng trong kho" tone="emerald" />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <h2 className="mr-auto text-sm font-semibold text-slate-900">
            {isLoading ? 'Đang tải...' : `${filtered.length} sản phẩm`}
          </h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm sản phẩm..."
              className="w-56 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Sản phẩm</th>
                <th className="px-5 py-3 text-left">Mã SKU</th>
                <th className="px-5 py-3 text-left">Giá vốn</th>
                <th className="px-5 py-3 text-left">Tồn kho</th>
                <th className="px-5 py-3 text-left">Trạng thái</th>
                <th className="px-5 py-3 text-left">Đánh giá</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const status = product.stock === 0
                  ? { label: 'Hết hàng', className: 'bg-red-100 text-red-700' }
                  : product.stock <= 10
                    ? { label: 'Sắp hết', className: 'bg-amber-100 text-amber-700' }
                    : { label: 'Còn hàng', className: 'bg-emerald-100 text-emerald-700' };

                return (
                  <tr key={product.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-4 text-sm font-medium text-slate-900">{product.name}</td>
                    <td className="px-5 py-4 text-sm text-slate-500 font-mono">{product.sku ?? '—'}</td>
                    <td className="px-5 py-4 text-sm text-slate-900">{product.priceVnd.toLocaleString('vi-VN')}₫</td>
                    <td className="px-5 py-4">
                      <span className={`text-sm font-semibold ${product.stock <= 10 ? 'text-red-600' : 'text-slate-900'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">
                      ★ {product.averageRating.toFixed(1)} ({product.reviewCount})
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!isLoading && filtered.length === 0 && (
            <div className="p-5">
              <SellerEmptyState
                icon={Boxes}
                title={search ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm nào'}
                description={search ? 'Thử tìm kiếm với từ khóa khác.' : 'Thêm sản phẩm để quản lý tồn kho.'}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
