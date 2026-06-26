'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Package, Search } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { formatVND } from '@lishop/shared';
import { sellerApi } from '@/lib/seller-api';
import { SellerPageHeader } from '../_components/seller-page-header';
import { SellerMetricCard } from '../_components/seller-metric-card';
import { SellerEmptyState } from '../_components/seller-empty-state';

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['seller-products'],
    queryFn: () => sellerApi.getMyProducts({ limit: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sellerApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      setDeleteId(null);
      toast.success('Đã xóa sản phẩm');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const items = data?.items ?? [];
  const filtered = search.trim()
    ? items.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()))
    : items;

  const avgRating = items.length > 0
    ? items.reduce((s, p) => s + p.averageRating, 0) / items.length
    : 0;

  return (
    <div className="space-y-6">
      <SellerPageHeader
        icon={Package}
        title="Sản phẩm"
        description="Quản lý danh sách sản phẩm của cửa hàng, thêm mới hoặc chỉnh sửa thông tin."
        badge="Vận hành"
        tone="violet"
        stats={[
          { label: 'Tổng sản phẩm', value: isLoading ? '...' : `${items.length}` },
          { label: 'Còn hàng', value: isLoading ? '...' : `${items.filter((p) => p.stock > 0).length}` },
          { label: 'Hết hàng', value: isLoading ? '...' : `${items.filter((p) => p.stock === 0).length}` },
          { label: 'Đánh giá TB', value: isLoading ? '...' : avgRating > 0 ? avgRating.toFixed(1) : '—' },
        ]}
        action={
          <Link
            href="/products/new"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            Thêm sản phẩm
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <SellerMetricCard icon={Package} label="Tổng sản phẩm" value={isLoading ? '...' : `${items.length}`} hint="Danh mục sản phẩm" tone="violet" />
        <SellerMetricCard icon={Package} label="Còn hàng" value={isLoading ? '...' : `${items.filter((p) => p.stock > 0).length}`} hint="Sản phẩm đang bán" tone="emerald" />
        <SellerMetricCard icon={Package} label="Sắp hết (≤10)" value={isLoading ? '...' : `${items.filter((p) => p.stock > 0 && p.stock <= 10).length}`} hint="Cần nhập thêm" tone="amber" />
        <SellerMetricCard icon={Package} label="Hết hàng" value={isLoading ? '...' : `${items.filter((p) => p.stock === 0).length}`} hint="Cần bổ sung" tone="rose" />
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
                <th className="px-5 py-3 text-left">Giá</th>
                <th className="px-5 py-3 text-left">Tồn kho</th>
                <th className="px-5 py-3 text-left">Đánh giá</th>
                <th className="px-5 py-3 text-left">Ngày tạo</th>
                <th className="px-5 py-3 text-left">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-4 text-sm font-medium text-slate-900">{product.name}</td>
                  <td className="px-5 py-4 font-mono text-sm text-slate-500">{product.sku ?? '—'}</td>
                  <td className="px-5 py-4 text-sm text-slate-900">{formatVND(product.priceVnd)}</td>
                  <td className="px-5 py-4">
                    <span className={`text-sm font-medium ${product.stock <= 10 ? 'text-red-600' : 'text-slate-900'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {product.averageRating > 0 ? `★ ${product.averageRating.toFixed(1)} (${product.reviewCount})` : '—'}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {new Date(product.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/products/${product.id}/edit`}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      {deleteId === product.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(product.id)}
                            disabled={deleteMutation.isPending}
                            className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Xác nhận
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(null)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteId(product.id)}
                          className="rounded-lg border border-red-200 p-2 text-red-500 transition hover:border-red-300 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && filtered.length === 0 && (
            <div className="p-5">
              <SellerEmptyState
                icon={Package}
                title={search ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm nào'}
                description={search ? 'Thử tìm kiếm với từ khóa khác.' : 'Bắt đầu thêm sản phẩm đầu tiên cho cửa hàng.'}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
