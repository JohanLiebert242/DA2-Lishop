'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { sellerApi, CreateSellerProductInput } from '../../../lib/seller-api';

export default function NewProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateSellerProductInput>({
    name: '',
    description: '',
    priceVnd: 0,
    priceUsd: 0,
    stock: 0,
    categoryId: '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => sellerApi.createProduct(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      toast.success('Đã thêm sản phẩm');
      router.push('/products');
    },
    onError: (err: Error) => setError(err.message),
  });

  // Default: auto-calc USD from VND
  const handlePriceVndChange = (value: number) => {
    setForm({ ...form, priceVnd: value, priceUsd: Math.round(value / 25000) });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Thêm sản phẩm</h1>
        <p className="text-sm text-gray-500">Nhập thông tin sản phẩm mới cho cửa hàng</p>
      </div>

      <div className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tên sản phẩm *</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            placeholder="VD: Áo thun nam cotton"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả *</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            placeholder="Mô tả chi tiết sản phẩm..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Giá (VND) *</label>
            <input
              type="number"
              value={form.priceVnd || ''}
              onChange={(e) => handlePriceVndChange(Number(e.target.value))}
              min={0}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Giá (USD)</label>
            <input
              type="number"
              value={form.priceUsd || ''}
              onChange={(e) => setForm({ ...form, priceUsd: Number(e.target.value) })}
              min={0}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tồn kho *</label>
            <input
              type="number"
              value={form.stock || ''}
              onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
              min={0}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Cân nặng (gram)</label>
            <input
              type="number"
              value={form.weightGrams || ''}
              onChange={(e) => setForm({ ...form, weightGrams: Number(e.target.value) })}
              min={1}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              placeholder="500"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Category ID</label>
          <input
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            placeholder="UUID của danh mục..."
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!form.name || !form.description || !form.priceVnd || !form.categoryId || mutation.isPending}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Đang lưu...' : 'Thêm sản phẩm'}
          </button>
        </div>
      </div>
    </div>
  );
}
