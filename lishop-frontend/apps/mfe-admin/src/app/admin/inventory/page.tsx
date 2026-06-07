'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Boxes, History, PackagePlus } from 'lucide-react';
import { adminApi, ProductStock } from '../../../lib/admin-api';
import { AdminEmptyState } from '../_components/admin-empty-state';
import { AdminMetricCard } from '../_components/admin-metric-card';
import { AdminPageHeader } from '../_components/admin-page-header';

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
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-700">Sap het</span>
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
          Dieu chinh
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
            <label htmlFor={`delta-${product.id}`} className="mb-1 block text-xs font-medium text-gray-700">
              Dieu chinh ton kho
            </label>
            <input
              id={`delta-${product.id}`}
              type="number"
              value={delta}
              onChange={(e) => setDelta(Number(e.target.value))}
              className="w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="min-w-40 flex-1">
            <label htmlFor={`note-${product.id}`} className="mb-1 block text-xs font-medium text-gray-700">
              Ghi chu
            </label>
            <textarea
              id={`note-${product.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={1}
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => adjustMutation.mutate()}
              disabled={delta === 0 || adjustMutation.isPending}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {adjustMutation.isPending ? 'Dang luu...' : 'Luu'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Huy
            </button>
          </div>
        </div>
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
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

  const lowStockProducts = inventory.filter((product) => product.isLowStock).length;
  const trackedMovements = inventory.filter((product) => product.lastMovement).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Boxes}
        title="Kho hang"
        description="Theo doi ton kho theo SKU, muc canh bao, can nang va lan bien dong gan nhat. Khu nay duoc thiet ke de doc nhanh khi can bo sung hang."
        badge="Inventory"
        tone="emerald"
        stats={[
          { label: 'SKU', value: isLoading ? '...' : `${inventory.length}` },
          { label: 'Ton thap', value: isLoading ? '...' : `${lowStockProducts}` },
          { label: 'Da co movement', value: isLoading ? '...' : `${trackedMovements}` },
          { label: 'Dang dieu hanh', value: 'Realtime' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard icon={PackagePlus} label="San pham theo doi" value={isLoading ? '...' : `${inventory.length}`} hint="Tong SKU co trong feed admin" tone="indigo" />
        <AdminMetricCard icon={AlertTriangle} label="Canh bao ton" value={isLoading ? '...' : `${lowStockProducts}`} hint="SKU dang o nguong nhay cam" tone="rose" />
        <AdminMetricCard icon={History} label="Da co lich su" value={isLoading ? '...' : `${trackedMovements}`} hint="SKU da ghi nhan movement gan day" tone="sky" />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            {isLoading ? 'Dang tai...' : `${inventory.length} san pham`}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">San pham</th>
                <th className="px-4 py-2 text-left">Ton kho</th>
                <th className="px-4 py-2 text-left">Can nang</th>
                <th className="px-4 py-2 text-left">Lan cap nhat cuoi</th>
                <th className="px-4 py-2 text-left">Thao tac</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((product) => (
                <React.Fragment key={product.id}>
                  <InventoryRow
                    product={product}
                    isAdjusting={adjustingProductId === product.id}
                    onAdjustClick={() => setAdjustingProductId((prev) => (prev === product.id ? null : product.id))}
                  />
                  {adjustingProductId === product.id ? (
                    <AdjustStockForm product={product} onClose={() => setAdjustingProductId(null)} />
                  ) : null}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {!isLoading && inventory.length === 0 ? (
            <div className="p-4">
              <AdminEmptyState
                icon={Boxes}
                title="Chua co san pham trong kho"
                description="Ngay khi inventory duoc dong bo tu backend, bang ton kho va khu KPI se hien thong tin dieu hanh tai day."
                tone="emerald"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
