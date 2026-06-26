'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { sellerApi } from '../../../../lib/seller-api';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const productId = params.id as string;
  const [error, setError] = useState('');

  const queryKey = ['seller-products'];

  // We fetch all products and find the one we need
  const { data } = useQuery({
    queryKey: queryKey,
    queryFn: () => sellerApi.getMyProducts({ limit: 100 }),
  });

  const product = data?.items.find((p) => p.id === productId);

  const [form, setForm] = useState({
    name: '',
    description: '',
    priceVnd: 0,
    priceUsd: 0,
    stock: 0,
    categoryId: '',
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        description: product.description,
        priceVnd: product.priceVnd,
        priceUsd: product.priceUsd,
        stock: product.stock,
        categoryId: product.categoryId,
      });
    }
  }, [product]);

  const mutation = useMutation({
    mutationFn: () => sellerApi.updateProduct(productId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      toast.success('Đã cập nhật sản phẩm');
      router.push('/products');
    },
    onError: (err: Error) => setError(err.message),
  });

  const handlePriceVndChange = (value: number) => {
    setForm({ ...form, priceVnd: value, priceUsd: Math.round(value / 25000) });
  };

  if (!product) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa sản phẩm</h1>
        <p className="text-sm text-gray-500">{product.name}</p>
      </div>

      <div className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tên sản phẩm</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Giá (VND)</label>
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Tồn kho</label>
            <input
              type="number"
              value={form.stock || ''}
              onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
              min={0}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Category ID</label>
            <input
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
          </div>
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
            disabled={!form.name || !form.description || !form.priceVnd || mutation.isPending}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Đang lưu...' : 'Cập nhật'}
          </button>
        </div>
      </div>
    </div>
  );
}
