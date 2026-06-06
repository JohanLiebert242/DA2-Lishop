'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatVND } from '@lishop/shared';
import { adminApi, AdminProduct, AdminCategory, CreateProductInput } from '../../../lib/admin-api';

interface ImageEntry { url: string; alt: string; isPrimary: boolean }

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseProductsCsv(text: string): CreateProductInput[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    const imageUrl = row['imageUrl']?.trim();
    const tags = row['tags']?.split('|').map((tag) => tag.trim()).filter(Boolean);

    return {
      name: row['name'] ?? '',
      ...(row['sku'] ? { sku: row['sku'] } : {}),
      description: row['description'] ?? '',
      priceVnd: Number(row['priceVnd'] ?? 0),
      priceUsd: Number(row['priceUsd'] ?? 0),
      stock: Number(row['stock'] ?? 0),
      weightGrams: Number(row['weightGrams'] ?? 500),
      ...(row['categoryId'] ? { categoryId: row['categoryId'] } : {}),
      ...(row['categorySlug'] ? { categorySlug: row['categorySlug'] } : {}),
      ...(imageUrl ? { images: [{ url: imageUrl, alt: row['imageAlt'] ?? '', isPrimary: true }] } : {}),
      ...(tags && tags.length > 0 ? { tags } : {}),
    };
  });
}

function parseProductsImport(text: string): CreateProductInput[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as CreateProductInput[] | { products: CreateProductInput[] };
    return Array.isArray(parsed) ? parsed : parsed.products;
  }
  return parseProductsCsv(trimmed);
}

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
  const [aiNotice, setAiNotice] = useState('');

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

  const copyMutation = useMutation({
    mutationFn: () => {
      const categoryName = categories.find((category) => category.id === categoryId)?.name;
      return adminApi.generateProductCopy({
        name: name.trim(),
        description: description.trim() || undefined,
        categoryName,
        priceVnd,
        stock,
        sku: sku.trim() || undefined,
      });
    },
    onSuccess: (result) => {
      setDescription(result.description);
      setAiNotice(result.fallback ? 'AI fallback da tao mo ta. Ban co the chinh sua truoc khi luu.' : 'AI da tao mo ta. Ban co the chinh sua truoc khi luu.');
      setError('');
    },
    onError: (err: Error) => {
      setAiNotice('');
      setError(err.message);
    },
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
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="block text-xs font-medium text-gray-700">Mô tả</label>
              <button
                type="button"
                onClick={() => copyMutation.mutate()}
                disabled={!name.trim() || copyMutation.isPending}
                className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copyMutation.isPending ? 'AI dang viet...' : 'AI viet mo ta'}
              </button>
            </div>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Mô tả sản phẩm..."
            />
            {aiNotice && <p className="mt-1 text-xs font-medium text-emerald-700">{aiNotice}</p>}
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

function ProductImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [rawText, setRawText] = useState('');
  const [previewCount, setPreviewCount] = useState(0);
  const [error, setError] = useState('');

  function refreshPreview(text: string) {
    setRawText(text);
    try {
      setPreviewCount(parseProductsImport(text).length);
      setError('');
    } catch (err) {
      setPreviewCount(0);
      setError(err instanceof Error ? err.message : 'Không đọc được dữ liệu import');
    }
  }

  const mutation = useMutation({
    mutationFn: () => {
      const products = parseProductsImport(rawText);
      if (products.length === 0) throw new Error('File import không có sản phẩm hợp lệ');
      return adminApi.importProducts(products);
    },
    onSuccess: () => onImported(),
    onError: (err: Error) => setError(err.message),
  });

  async function handleFile(file: File | undefined) {
    if (!file) return;
    refreshPreview(await file.text());
  }

  const sampleCsv = 'name,sku,description,priceVnd,priceUsd,stock,weightGrams,categorySlug,imageUrl,tags\nÁo imported,IMP-001,Mô tả sản phẩm,199000,799,20,500,thoi-trang,https://example.com/image.jpg,import|new';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Import sản phẩm</h3>
        <div className="space-y-3">
          <input
            type="file"
            accept=".json,.csv,text/csv,application/json"
            onChange={(event) => handleFile(event.target.files?.[0])}
            className="block w-full cursor-pointer rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700"
          />
          <textarea
            value={rawText}
            onChange={(event) => refreshPreview(event.target.value)}
            rows={10}
            className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 font-mono text-xs focus:border-indigo-500 focus:outline-none"
            placeholder={sampleCsv}
          />
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            CSV cần header. Dùng <span className="font-mono">categoryId</span> hoặc <span className="font-mono">categorySlug</span>. JSON có thể là mảng sản phẩm hoặc object <span className="font-mono">{'{"products":[]}'}</span>.
          </div>
          {previewCount > 0 && (
            <p className="text-xs font-medium text-emerald-700">Đã đọc {previewCount} sản phẩm.</p>
          )}
          {mutation.data && (
            <div className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
              Tạo thành công {mutation.data.created}, lỗi {mutation.data.failed}.
              {mutation.data.errors.length > 0 && (
                <ul className="mt-1 list-disc pl-4">
                  {mutation.data.errors.slice(0, 5).map((item) => (
                    <li key={`${item.index}-${item.name}`}>Dòng {item.index + 1}: {item.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Đóng
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={previewCount === 0 || mutation.isPending}
            className="cursor-pointer rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Đang import...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [showProductModal, setShowProductModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
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
          onClick={() => setShowImportModal(true)}
          className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 whitespace-nowrap"
        >
          Import
        </button>
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
      {showImportModal && (
        <ProductImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => queryClient.invalidateQueries({ queryKey: ['admin-products'] })}
        />
      )}
    </div>
  );
}
