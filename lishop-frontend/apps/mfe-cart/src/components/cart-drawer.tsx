'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { formatVND } from '@lishop/shared';
import { cartApi } from '../lib/cart-api';

const MFE_CART = 'http://localhost:3003';
const MFE_CHECKOUT = 'http://localhost:3004';

interface CartDrawerProps {
  open?: boolean;
  onClose?: () => void;
  standalone?: boolean;
}

export default function CartDrawer({ open = true, onClose, standalone = false }: CartDrawerProps) {
  const qc = useQueryClient();

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart-drawer'],
    queryFn: () => cartApi.getCart(),
    enabled: open,
    staleTime: 30_000,
  });

  const itemCount = (data: { items: { quantity: number }[] }) =>
    data.items.reduce((sum, i) => sum + i.quantity, 0);

  const updateMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartApi.updateItem(productId, quantity),
    onSuccess: (data) => {
      qc.setQueryData(['cart-drawer'], data);
      qc.invalidateQueries({ queryKey: ['cart'] });
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('lishop_cart_count', String(itemCount(data)));
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => cartApi.removeItem(productId),
    onSuccess: (data) => {
      qc.setQueryData(['cart-drawer'], data);
      qc.invalidateQueries({ queryKey: ['cart'] });
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('lishop_cart_count', String(itemCount(data)));
      }
    },
  });

  // Sync total quantity to localStorage whenever cart changes
  useEffect(() => {
    if (cart && typeof window !== 'undefined') {
      window.localStorage.setItem('lishop_cart_count', String(itemCount(cart)));
    }
  }, [cart]);

  // Close on Escape key
  useEffect(() => {
    if (!onClose) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;

  const isPending = updateMutation.isPending || removeMutation.isPending;

  const drawerContent = (
    <div
      className={`flex h-full flex-col bg-white ${standalone ? 'min-h-screen' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
        <h2 className="text-base font-bold text-gray-900">
          Giỏ hàng{cart ? ` (${cart.items.length})` : ''}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Đóng"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">
            Đang tải...
          </div>
        ) : !cart || cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <svg className="h-12 w-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <p className="text-sm text-gray-500">Giỏ hàng của bạn đang trống</p>
            <a
              href="http://localhost:3002/products"
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Mua sắm ngay
            </a>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {cart.items.map((item) => (
              <li key={item.productId} className="flex gap-3 py-3">
                {/* Image */}
                <a href={`http://localhost:3002/products/${item.productSlug}`} className="shrink-0">
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-gray-100">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300 text-xs">?</div>
                    )}
                  </div>
                </a>

                {/* Info */}
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <a
                    href={`http://localhost:3002/products/${item.productSlug}`}
                    className="text-sm font-medium text-gray-800 hover:text-indigo-600 line-clamp-2 leading-snug"
                  >
                    {item.productName}
                  </a>
                  <p className="text-sm font-bold text-indigo-600">{formatVND(item.priceVnd)}</p>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={isPending || item.quantity <= 1}
                      onClick={() => updateMutation.mutate({ productId: item.productId, quantity: item.quantity - 1 })}
                      className="h-6 w-6 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center text-sm leading-none"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      disabled={isPending || item.quantity >= item.stock}
                      onClick={() => updateMutation.mutate({ productId: item.productId, quantity: item.quantity + 1 })}
                      className="h-6 w-6 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center text-sm leading-none"
                    >
                      +
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => removeMutation.mutate(item.productId)}
                      className="ml-auto text-xs text-red-400 hover:text-red-600 disabled:opacity-40"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      {cart && cart.items.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-3 bg-white">
          {cart.discountVnd > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span>Giảm giá ({cart.couponCode})</span>
              <span>− {formatVND(cart.discountVnd)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-semibold text-gray-900">
            <span>Tạm tính</span>
            <span className="text-indigo-600">{formatVND(cart.totalVnd)}</span>
          </div>
          <div className="flex gap-2">
            <a
              href={`${MFE_CART}/cart`}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Xem giỏ hàng
            </a>
            <a
              href={`${MFE_CHECKOUT}/checkout`}
              className="flex-1 rounded-lg bg-indigo-600 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Thanh toán
            </a>
          </div>
        </div>
      )}
    </div>
  );

  if (standalone) {
    return drawerContent;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-80 shadow-2xl">
        {drawerContent}
      </div>
    </>
  );
}
