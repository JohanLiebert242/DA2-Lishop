'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatVND } from '@lishop/shared';
import { adminApi, AdminProduct, AdminCategory, CreateProductInput } from '../../../lib/admin-api';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

function imageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return `${API_URL}${url}`;
  return url;
}

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
      ? existing.images.map((image) => ({ url: image.url, alt: image.alt ?? '', isPrimary: image.isPrimary }))
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
      if (next.length > 0 && !next.some((image) => image.isPrimary)) next[0]!.isPrimary = true;
      return next;
    });
  }

  function setPrimary(idx: number) {
    setImages((prev) => prev.map((img, i) => ({ ...img, isPrimary: i === idx })));
  }

  const mutation = useMutation({
    mutationFn: () => {
      const data: CreateProductInput = {
        name,
        description,
        priceVnd,
        priceUsd,
        stock,
        weightGrams,
        categoryId,
        ...(sku.trim() ? { sku: sku.trim() } : {}),
        ...(images.length ? { images } : {}),
      };
      return existing ? adminApi.updateProduct(existing.id, data) : adminApi.createProduct(data);
    },
    onSuccess: () => {
      toast.success(existing ? 'Đã cập nhật sản phẩm' : 'Đã tạo sản phẩm mới');
      onSaved();
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error(err.message);
    },
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
      setTimeout(() => {
        setDescription(result.description);
        setAiNotice(
          result.fallback
            ? 'AI ở chế độ dự phòng đã tạo mô tả. Bạn có thể chỉnh sửa trước khi lưu.'
            : 'AI đã tạo mô tả. Bạn có thể chỉnh sửa trước khi lưu.',
        );
        setError('');
      }, 0);
    },
    onError: (err: Error) => {
      setAiNotice('');
      setError(err.message);
    },
  });

  const generateImageMutation = useMutation({
    mutationFn: () => {
      if (!existing?.id) throw new Error('Vui lòng lưu sản phẩm trước khi tạo ảnh AI');
      return adminApi.generateProductImage(existing.id);
    },
    onSuccess: (result) => {
      const msg = result.source === 'unsplash'
        ? 'AI đã tìm thấy ảnh sản phẩm từ Unsplash.'
        : 'AI đã tạo ảnh nền (vui lòng cấu hình Unsplash API key để tìm ảnh thật).';
      setTimeout(() => {
        setImages((prev) => [{ url: result.image.url, alt: result.image.alt, isPrimary: result.image.isPrimary }, ...prev]);
        setAiNotice(msg);
        setError('');
      }, 0);
    },
    onError: (err: Error) => {
      setAiNotice('');
      setError(err.message);
    },
  });

  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          {existing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Tên sản phẩm</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Tên sản phẩm..." />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Mã hàng <span className="text-gray-400">(không bắt buộc)</span>
            </label>
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
                {copyMutation.isPending ? 'AI đang viết...' : 'AI viết mô tả'}
              </button>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Mô tả sản phẩm..."
            />
            {aiNotice && <p className="mt-1 text-xs font-medium text-emerald-700">{aiNotice}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Giá (VND)</label>
              <input type="number" min={0} value={priceVnd} onChange={(e) => setPriceVnd(Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Giá (xu USD)</label>
              <input type="number" min={0} value={priceUsd} onChange={(e) => setPriceUsd(Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Tồn kho</label>
              <input type="number" min={0} value={stock} onChange={(e) => setStock(Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Trọng lượng (g)</label>
              <input type="number" min={1} value={weightGrams} onChange={(e) => setWeightGrams(Number(e.target.value))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Danh mục</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Hình ảnh sản phẩm</label>
            {images.length > 0 && (
              <ul className="mb-2 space-y-1.5">
                {images.map((img, idx) => (
                  <li key={idx} className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5 text-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl(img.url)}
                      alt={img.alt || ''}
                      className="h-8 w-8 shrink-0 rounded bg-gray-100 object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="flex-1 truncate text-gray-600">{img.url}</span>
                    {img.alt && <span className="shrink-0 text-gray-400">{img.alt}</span>}
                    <button
                      type="button"
                      onClick={() => setPrimary(idx)}
                      className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${img.isPrimary ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:text-indigo-600'}`}
                    >
                      {img.isPrimary ? '★ Chính' : '☆'}
                    </button>
                    <button type="button" onClick={() => removeImage(idx)} className="shrink-0 text-red-400 hover:text-red-600">✕</button>
                  </li>
                ))}
              </ul>
            )}
            {existing && (
              <button
                type="button"
                onClick={() => generateImageMutation.mutate()}
                disabled={generateImageMutation.isPending}
                className="mb-2 w-full rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50"
              >
                {generateImageMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Đang tạo ảnh AI...
                  </span>
                ) : (
                  '🤖 Tạo ảnh AI'
                )}
              </button>
            )}
            <div className="flex gap-2">
              <input
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="URL ảnh..."
              />
              <input
                value={newImageAlt}
                onChange={(e) => setNewImageAlt(e.target.value)}
                className="w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="Mô tả ảnh"
              />
              <button
                type="button"
                onClick={addImage}
                disabled={!newImageUrl.trim()}
                className="rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
              >
                + Thêm
              </button>
            </div>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Hủy
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || !description.trim() || !categoryId || mutation.isPending}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Đang lưu...' : existing ? 'Cập nhật' : 'Tạo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
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
      setError(err instanceof Error ? err.message : 'Không đọc được dữ liệu nhập');
    }
  }

  const mutation = useMutation({
    mutationFn: () => {
      const products = parseProductsImport(rawText);
      if (products.length === 0) throw new Error('Tệp nhập không có sản phẩm hợp lệ');
      return adminApi.importProducts(products);
    },
    onSuccess: () => onImported(),
    onError: (err: Error) => setError(err.message),
  });

  async function handleFile(file: File | undefined) {
    if (!file) return;
    refreshPreview(await file.text());
  }

  const sampleCsv = 'name,sku,description,priceVnd,priceUsd,stock,weightGrams,categorySlug,imageUrl,tags\nAo imported,IMP-001,Mo ta san pham,199000,799,20,500,thoi-trang,https://example.com/image.jpg,import|new';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Nhập sản phẩm</h3>
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
            CSV cần dòng tiêu đề. Dùng <span className="font-mono">categoryId</span> hoặc <span className="font-mono">categorySlug</span>. JSON có thể là mảng sản phẩm hoặc object <span className="font-mono">{'{"products":[]}'}</span>.
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
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Đóng
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={previewCount === 0 || mutation.isPending}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Đang nhập...' : 'Nhập'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductAiImportEnrichModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState<CreateProductInput[]>([]);
  const [error, setError] = useState('');
  const [aiNotice, setAiNotice] = useState('');

  const analyzeMutation = useMutation({
    mutationFn: () => {
      if (!rawText.trim()) throw new Error('Vui lòng nhập dữ liệu cần AI phân tích');
      return adminApi.aiImportEnrichProducts(rawText);
    },
    onSuccess: (result) => {
      setPreview(result.products ?? []);
      setAiNotice(
        result.fallback
          ? 'AI ở chế độ dự phòng đã tự động chuẩn hóa và làm giàu dữ liệu. Hãy xem lại trước khi nhập.'
          : 'AI đã phân tích và làm giàu dữ liệu. Hãy xem lại trước khi nhập.',
      );
      setError('');
    },
    onError: (err: Error) => {
      setPreview([]);
      setAiNotice('');
      setError(err.message);
    },
  });

  const importMutation = useMutation({
    mutationFn: () => {
      if (preview.length === 0) throw new Error('Chưa có sản phẩm để nhập');
      return adminApi.importProducts(preview);
    },
    onSuccess: () => onImported(),
    onError: (err: Error) => setError(err.message),
  });

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setRawText(await file.text());
  }

  const sample = [
    'Danh sách sản phẩm cần nhập:',
    '- Áo thun nam giá 199k tồn 20, danh mục thời-trang',
    '- Tai nghe Bluetooth gia 399k ton 8',
  ].join('\n');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-base font-semibold text-gray-900">AI nhập liệu nâng cao</h3>
        <div className="space-y-3">
          <input
            type="file"
            accept=".txt,.json,.csv,text/plain,text/csv,application/json"
            onChange={(event) => handleFile(event.target.files?.[0])}
            className="block w-full cursor-pointer rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700"
          />
          <textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            rows={10}
            className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 font-mono text-xs focus:border-indigo-500 focus:outline-none"
            placeholder={sample}
          />
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            Dán CSV, JSON hoặc mô tả tự do. AI sẽ cố gắng chuẩn hóa dữ liệu thành danh sách sản phẩm để nhập.
          </div>
          {aiNotice && <p className="text-xs font-medium text-emerald-700">{aiNotice}</p>}
          {preview.length > 0 && (
            <div className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
              Đã chuẩn bị {preview.length} sản phẩm. (Xem trước: {preview.slice(0, 3).map((p) => p.name).join(', ')}{preview.length > 3 ? ', ...' : ''})
            </div>
          )}
          {importMutation.data && (
            <div className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
              Tạo thành công {importMutation.data.created}, lỗi {importMutation.data.failed}.
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Đóng
          </button>
          <button
            type="button"
            onClick={() => analyzeMutation.mutate()}
            disabled={!rawText.trim() || analyzeMutation.isPending}
            className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            {analyzeMutation.isPending ? 'AI đang phân tích...' : 'AI phân tích'}
          </button>
          <button
            type="button"
            onClick={() => importMutation.mutate()}
            disabled={preview.length === 0 || importMutation.isPending}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {importMutation.isPending ? 'Đang nhập...' : 'Nhập'}
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
  const [showAiImportModal, setShowAiImportModal] = useState(false);
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
    onSuccess: () => {
      toast.success('Đã xoá sản phẩm');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const allProducts = productsData?.items ?? [];
  const filtered = productSearch.trim()
    ? allProducts.filter((product) => product.name.toLowerCase().includes(productSearch.toLowerCase()))
    : allProducts;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <h2 className="mr-auto text-sm font-semibold text-gray-900">
          {isLoading ? 'Đang tải...' : `${allProducts.length} sản phẩm`}
        </h2>
        <input
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          placeholder="Tìm sản phẩm..."
          className="w-48 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setShowImportModal(true)}
          className="whitespace-nowrap rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
        >
          Nhập dữ liệu
        </button>
        <button
          type="button"
          onClick={() => setShowAiImportModal(true)}
          className="whitespace-nowrap rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          AI nhập liệu nâng cao
        </button>
        <button
          type="button"
          onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
          className="whitespace-nowrap rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
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
              const img = product.images.find((image) => image.isPrimary) ?? product.images[0];
              return (
                <tr key={product.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl(img.url)} alt={img.alt ?? product.name} className="h-10 w-10 rounded-md object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-gray-100" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="max-w-[200px] truncate text-sm font-medium text-gray-900">{product.name}</p>
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
      {showAiImportModal && (
        <ProductAiImportEnrichModal
          onClose={() => setShowAiImportModal(false)}
          onImported={() => queryClient.invalidateQueries({ queryKey: ['admin-products'] })}
        />
      )}
    </div>
  );
}
