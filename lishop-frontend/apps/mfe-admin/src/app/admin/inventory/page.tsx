'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, ProductStock } from '../../../lib/admin-api';

function InventoryRow({
  product,
  isAdjusting,
  onAdjustClick,
}: {
  product: ProductStock;
  isAdjusting: boolean;
  onAdjustClick: () => void;
}) {
  return (
    <tr className="border-b last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900">{product.name}</p>
        <p className="text-xs text-gray-400">{product.slug}</p>
      </td>
      <td className="px-4 py-3 text-sm">
        {product.isLowStock ? (
          <span className="font-semibold text-red-600">
            {product.stock}{' '}
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-700">⚠ Sắp hết</span>
          </span>
        ) : (
          <span className="font-medium text-gray-900">{product.stock}</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{product.weightGrams}g</td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {product.lastMovement ? (
          <span>
            {product.lastMovement.type}{' '}
            <span className={product.lastMovement.delta >= 0 ? 'text-green-600' : 'text-red-600'}>
              {product.lastMovement.delta >= 0 ? '+' : ''}{product.lastMovement.delta}
            </span>
            {' · '}{new Date(product.lastMovement.createdAt).toLocaleDateString('vi-VN')}
          </span>
        ) : '—'}
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={onAdjustClick}
          className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
            isAdjusting
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Điều chỉnh
        </button>
      </td>
    </tr>
  );
}

function AdjustStockForm({ product, onClose }: { product: ProductStock; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [delta, setDelta] = useState(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const adjustMutation = useMutation({
    mutationFn: () => adminApi.adjustStock(product.id, delta, note || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <tr className="border-b bg-indigo-50">
      <td colSpan={5} className="px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor={`delta-${product.id}`} className="block text-xs font-medium text-gray-700 mb-1">
              Điều chỉnh tồn kho (+ thêm, - bớt)
            </label>
            <input
              id={`delta-${product.id}`}
              type="number"
              value={delta}
              onChange={(e) => setDelta(Number(e.target.value))}
              className="w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex-1 min-w-40">
            <label htmlFor={`note-${product.id}`} className="block text-xs font-medium text-gray-700 mb-1">
              Ghi chú (không bắt buộc)
            </label>
            <textarea
              id={`note-${product.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={1}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => adjustMutation.mutate()}
              disabled={delta === 0 || adjustMutation.isPending}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {adjustMutation.isPending ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </td>
    </tr>
  );
}

export default function InventoryPage() {
  const [adjustingProductId, setAdjustingProductId] = useState<string | null>(null);

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: () => adminApi.getInventory(),
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h2 className="text-sm font-semibold text-gray-900">
          {isLoading ? 'Đang tải...' : `${inventory.length} sản phẩm`}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Sản phẩm</th>
              <th className="px-4 py-2 text-left">Tồn kho</th>
              <th className="px-4 py-2 text-left">Cân nặng</th>
              <th className="px-4 py-2 text-left">Lần cập nhật cuối</th>
              <th className="px-4 py-2 text-left">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((product) => (
              <React.Fragment key={product.id}>
                <InventoryRow
                  product={product}
                  isAdjusting={adjustingProductId === product.id}
                  onAdjustClick={() =>
                    setAdjustingProductId((prev) => prev === product.id ? null : product.id)
                  }
                />
                {adjustingProductId === product.id && (
                  <AdjustStockForm
                    product={product}
                    onClose={() => setAdjustingProductId(null)}
                  />
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {!isLoading && inventory.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có sản phẩm.</p>
        )}
      </div>
    </div>
  );
}
