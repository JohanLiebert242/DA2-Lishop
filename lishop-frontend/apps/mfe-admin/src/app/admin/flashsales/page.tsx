'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, AdminFlashSale, FlashSaleItem } from '../../../lib/admin-api';

interface FlashSaleModalProps {
  existing?: AdminFlashSale;
  onClose: () => void;
  onSaved: () => void;
}

function FlashSaleModal({ existing, onClose, onSaved }: FlashSaleModalProps) {
  const toLocal = (iso: string) => iso ? iso.slice(0, 16) : '';
  const [startAt, setStartAt] = useState(toLocal(existing?.startAt ?? ''));
  const [endAt, setEndAt] = useState(toLocal(existing?.endAt ?? ''));
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const data = { startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString(), isActive };
      return existing
        ? adminApi.updateFlashSale(existing.id, data)
        : adminApi.createFlashSale(data);
    },
    onSuccess: () => { onSaved(); onClose(); },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          {existing ? 'Chỉnh sửa Flash Sale' : 'Tạo Flash Sale mới'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Bắt đầu</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Kết thúc</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600"
            />
            Kích hoạt ngay
          </label>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button" onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!startAt || !endAt || mutation.isPending}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Đang lưu...' : existing ? 'Cập nhật' : 'Tạo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FlashSaleItemsPanel({ sale }: { sale: AdminFlashSale }) {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState('');
  const [discountPercent, setDiscountPercent] = useState(10);
  const [addError, setAddError] = useState('');

  const addMutation = useMutation({
    mutationFn: () => adminApi.addFlashSaleItem(sale.id, productId.trim(), discountPercent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flash-sales'] });
      setProductId('');
      setDiscountPercent(10);
      setAddError('');
    },
    onError: (err: Error) => setAddError(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => adminApi.removeFlashSaleItem(sale.id, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-flash-sales'] }),
  });

  return (
    <tr className="border-b bg-indigo-50">
      <td colSpan={6} className="px-6 py-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
          Sản phẩm trong Flash Sale
        </p>
        {sale.items.length === 0 ? (
          <p className="mb-3 text-xs text-gray-500">Chưa có sản phẩm nào.</p>
        ) : (
          <table className="mb-3 w-full rounded-md overflow-hidden text-xs">
            <thead className="bg-indigo-100 text-indigo-800">
              <tr>
                <th className="px-3 py-1.5 text-left">Sản phẩm</th>
                <th className="px-3 py-1.5 text-left">Giá gốc</th>
                <th className="px-3 py-1.5 text-left">Giảm giá</th>
                <th className="px-3 py-1.5 text-left"></th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {sale.items.map((item: FlashSaleItem) => (
                <tr key={item.id} className="border-t border-indigo-100">
                  <td className="px-3 py-1.5 text-gray-900">{item.product.name}</td>
                  <td className="px-3 py-1.5 text-gray-600">{(item.product.priceVnd / 1000).toFixed(0)}k</td>
                  <td className="px-3 py-1.5">
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 font-medium text-orange-800">
                      -{item.discountPercent}%
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => removeMutation.mutate(item.id)}
                      disabled={removeMutation.isPending}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Product ID (UUID)</label>
            <input
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-..."
              className="w-64 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Giảm giá (%)</label>
            <input
              type="number" min={1} max={99} value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
              className="w-20 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => addMutation.mutate()}
            disabled={!productId.trim() || addMutation.isPending}
            className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {addMutation.isPending ? 'Đang thêm...' : '+ Thêm sản phẩm'}
          </button>
        </div>
        {addError && <p className="mt-1 text-xs text-red-600">{addError}</p>}
      </td>
    </tr>
  );
}

export default function FlashSalesPage() {
  const queryClient = useQueryClient();
  const [showFlashSaleModal, setShowFlashSaleModal] = useState(false);
  const [editingFlashSale, setEditingFlashSale] = useState<AdminFlashSale | null>(null);
  const [expandedFlashSaleId, setExpandedFlashSaleId] = useState<string | null>(null);

  const { data: flashSales = [], isLoading } = useQuery({
    queryKey: ['admin-flash-sales'],
    queryFn: () => adminApi.getFlashSales(),
  });

  const deleteFlashSaleMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteFlashSale(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flash-sales'] });
      setExpandedFlashSaleId(null);
    },
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">
          {isLoading ? 'Đang tải...' : `${flashSales.length} Flash Sale`}
        </h2>
        <button
          type="button"
          onClick={() => { setEditingFlashSale(null); setShowFlashSaleModal(true); }}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
        >
          + Tạo Flash Sale
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Bắt đầu</th>
              <th className="px-4 py-2 text-left">Kết thúc</th>
              <th className="px-4 py-2 text-left">Trạng thái</th>
              <th className="px-4 py-2 text-left">Số SP</th>
              <th className="px-4 py-2 text-left">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {flashSales.map((sale) => (
              <React.Fragment key={sale.id}>
                <tr className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {new Date(sale.startAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {new Date(sale.endAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      sale.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {sale.isActive ? 'Đang bật' : 'Tắt'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{sale.items.length} sản phẩm</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setExpandedFlashSaleId((prev) => prev === sale.id ? null : sale.id)}
                        className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                          expandedFlashSaleId === sale.id
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Sản phẩm
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingFlashSale(sale); setShowFlashSaleModal(true); }}
                        className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Xóa Flash Sale này?')) {
                            deleteFlashSaleMutation.mutate(sale.id);
                          }
                        }}
                        disabled={deleteFlashSaleMutation.isPending}
                        className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedFlashSaleId === sale.id && (
                  <FlashSaleItemsPanel sale={sale} />
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {!isLoading && flashSales.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có Flash Sale nào.</p>
        )}
      </div>

      {showFlashSaleModal && (
        <FlashSaleModal
          existing={editingFlashSale ?? undefined}
          onClose={() => { setShowFlashSaleModal(false); setEditingFlashSale(null); }}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-flash-sales'] })}
        />
      )}
    </div>
  );
}
