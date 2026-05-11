'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatVND } from '@lishop/shared';
import { adminApi, AdminProduct, AdminCategory, CreateProductInput } from '../../../lib/admin-api';

interface ImageEntry { url: string; alt: string; isPrimary: boolean }

interface ProductModalProps {
  existing?: AdminProduct;
  categories: AdminCategory[];
  onClose: () => void;
  onSaved: () => void;
}

function ProductModal({ existing, categories, onClose, onSaved }: ProductModalProps) {
  const [name, setName] = useState(existing?.name ?? '');
  const [sku, setSku] = useState(existing?.sku ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [priceVnd, setPriceVnd] = useState(existing?.priceVnd ?? 0);
  const [priceUsd, setPriceUsd] = useState(existing?.priceUsd ?? 0);
  const [stock, setStock] = useState(existing?.stock ?? 0);
  const [weightGrams, setWeightGrams] = useState(existing?.weightGrams ?? 500);
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? (categories[0]?.id ?? ''));
  const [images, setImages] = useState<ImageEntry[]>(
    existing?.images.length
      ? existing.images.map((i) => ({ url: i.url, alt: i.alt ?? '', isPrimary: i.isPrimary }))
      : [],
  );
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageAlt, setNewImageAlt] = useState('');
  const [error, setError] = useState('');

  function addImage() {
    if (!newImageUrl.trim()) return;
    setImages((prev) => {
      const isPrimary = prev.length === 0;
      return [...prev, { url: newImageUrl.trim(), alt: newImageAlt.trim(), isPrimary }];
    });
    setNewImageUrl('');
    setNewImageAlt('');
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length > 0 && !next.some((i) => i.isPrimary)) next[0]!.isPrimary = true;
      return next;
    });
  }

  function setPrimary(idx: number) {
    setImages((prev) => prev.map((img, i) => ({ ...img, isPrimary: i === idx })));
  }

  const mutation = useMutation({
    mutationFn: () => {
      const data: CreateProductInput = {
        name, description, priceVnd, priceUsd, stock, weightGrams, categoryId,
        ...(sku.trim() ? { sku: sku.trim() } : {}),
        ...(images.length ? { images } : {}),
      };
      return existing
        ? adminApi.updateProduct(existing.id, data)
        : adminApi.createProduct(data);
    },
    onSuccess: () => { onSaved(); onClose(); },
    onError: (err: Error) => setError(err.message),
  });

  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          {existing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tên sản phẩm</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Tên sản phẩm..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">SKU <span className="text-gray-400">(không bắt buộc)</span></label>
            <input value={sku} onChange={(e) => setSku(e.target.value)} className={inputCls} placeholder="VD: PROD-001" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Mô tả sản phẩm..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Giá (VND)</label>
              <input type="number" min={0} value={priceVnd} onChange={(e) => setPriceVnd(Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Giá (USD cents)</label>
              <input type="number" min={0} value={priceUsd} onChange={(e) => setPriceUsd(Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tồn kho</label>
              <input type="number" min={0} value={stock} onChange={(e) => setStock(Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Trọng lượng (g)</label>
              <input type="number" min={1} value={weightGrams} onChange={(e) => setWeightGrams(Number(e.target.value))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Danh mục</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Hình ảnh sản phẩm</label>
            {images.length > 0 && (
              <ul className="mb-2 space-y-1.5">
                {images.map((img, idx) => (
                  <li key={idx} className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5 text-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.alt || ''} className="h-8 w-8 shrink-0 rounded object-cover bg-gray-100" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    <span className="flex-1 truncate text-gray-600">{img.url}</span>
                    {img.alt && <span className="shrink-0 text-gray-400">{img.alt}</span>}
                    <button
                      type="button" onClick={() => setPrimary(idx)}
                      className={`shrink-0 cursor-pointer rounded px-1.5 py-0.5 text-xs font-medium ${img.isPrimary ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:text-indigo-600'}`}
                    >
                      {img.isPrimary ? '★ Chính' : '☆'}
                    </button>
                    <button type="button" onClick={() => removeImage(idx)} className="shrink-0 cursor-pointer text-red-400 hover:text-red-600">✕</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="URL ảnh..."
              />
              <input
                value={newImageAlt} onChange={(e) => setNewImageAlt(e.target.value)}
                className="w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Alt text"
              />
              <button
                type="button" onClick={addImage} disabled={!newImageUrl.trim()}
                className="cursor-pointer rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
              >
                + Thêm
              </button>
            </div>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Hủy
          </button>
          <button
            type="button" onClick={() => mutation.mutate()}
            disabled={!name.trim() || !description.trim() || !categoryId || mutation.isPending}
            className="cursor-pointer rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Đang lưu...' : existing ? 'Cập nhật' : 'Tạo'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [productSearch, setProductSearch] = useState('');

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => adminApi.listProducts(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminApi.listCategories(),
    enabled: showProductModal,
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const allProducts = productsData?.items ?? [];
  const filtered = productSearch.trim()
    ? allProducts.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : allProducts;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <h2 className="mr-auto text-sm font-semibold text-gray-900">
          {isLoading ? 'Đang tải...' : `${allProducts.length} sản phẩm`}
        </h2>
        <input
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          placeholder="Tìm sản phẩm..."
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none w-48"
        />
        <button
          type="button"
          onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 whitespace-nowrap"
        >
          + Thêm sản phẩm
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Hình</th>
              <th className="px-4 py-2 text-left">Tên sản phẩm</th>
              <th className="px-4 py-2 text-left">Danh mục</th>
              <th className="px-4 py-2 text-left">Giá (VND)</th>
              <th className="px-4 py-2 text-left">Kho</th>
              <th className="px-4 py-2 text-left">Đánh giá</th>
              <th className="px-4 py-2 text-left">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => {
              const img = product.images.find((i) => i.isPrimary) ?? product.images[0];
              return (
                <tr key={product.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img.url} alt={img.alt ?? product.name} className="h-10 w-10 rounded-md object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-gray-100" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900 max-w-[200px] truncate">{product.name}</p>
                    <p className="text-xs text-gray-400">{product.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{product.category.name}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatVND(product.priceVnd)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${product.stock <= 10 ? 'text-red-600' : 'text-gray-900'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    ★ {product.averageRating.toFixed(1)} ({product.reviewCount})
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setEditingProduct(product); setShowProductModal(true); }}
                        className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Xóa sản phẩm "${product.name}"?`)) {
                            deleteProductMutation.mutate(product.id);
                          }
                        }}
                        disabled={deleteProductMutation.isPending}
                        className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">
            {productSearch ? 'Không tìm thấy sản phẩm.' : 'Chưa có sản phẩm nào.'}
          </p>
        )}
      </div>

      {showProductModal && (
        <ProductModal
          existing={editingProduct ?? undefined}
          categories={categories}
          onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-products'] })}
        />
      )}
    </div>
  );
}
