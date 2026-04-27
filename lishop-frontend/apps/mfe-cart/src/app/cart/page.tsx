'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { formatVND } from '@lishop/shared';
import { cartApi, CartItemData } from '../../lib/cart-api';

const AUTH_URL = process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001';

function useAuthGuard() {
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)lishop_at=([^;]*)/);
    if (!match) window.location.replace(`${AUTH_URL}/login`);
  }, []);
}

function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  isPending,
}: {
  item: CartItemData;
  onUpdateQuantity: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300 text-xs">No img</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <Link
          href={`http://localhost:3002/products/${item.productSlug}`}
          className="block text-sm font-medium text-gray-900 hover:text-indigo-600 line-clamp-2"
        >
          {item.productName}
        </Link>
        <p className="mt-1 text-sm font-bold text-indigo-600">{formatVND(item.priceVnd)}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          disabled={isPending || item.quantity <= 1}
          onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
          className="h-7 w-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center text-lg leading-none"
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
        <button
          disabled={isPending || item.quantity >= item.stock}
          onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
          className="h-7 w-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center text-lg leading-none"
        >
          +
        </button>
      </div>

      <div className="text-right shrink-0 w-28">
        <p className="text-sm font-bold text-gray-900">{formatVND(item.priceVnd * item.quantity)}</p>
        <button
          disabled={isPending}
          onClick={() => onRemove(item.productId)}
          className="mt-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
        >
          Xóa
        </button>
      </div>
    </div>
  );
}

export default function CartPage() {
  useAuthGuard();
  const qc = useQueryClient();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.getCart(),
    retry: false,
  });

  // Sync item count to localStorage for the shell cart badge
  useEffect(() => {
    if (cart && typeof window !== 'undefined') {
      window.localStorage.setItem('lishop_cart_count', String(cart.items.length));
    }
  }, [cart]);

  const updateMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartApi.updateItem(productId, quantity),
    onSuccess: (data) => qc.setQueryData(['cart'], data),
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => cartApi.removeItem(productId),
    onSuccess: (data) => qc.setQueryData(['cart'], data),
  });

  const couponMutation = useMutation({
    mutationFn: (code: string) => cartApi.applyCoupon(code),
    onSuccess: (data) => {
      qc.setQueryData(['cart'], data);
      setCouponError('');
      setCouponInput('');
    },
    onError: (err: Error) => setCouponError(err.message),
  });

  const removeCouponMutation = useMutation({
    mutationFn: () => cartApi.removeCoupon(),
    onSuccess: (data) => qc.setQueryData(['cart'], data),
  });

  const isPending =
    updateMutation.isPending || removeMutation.isPending ||
    couponMutation.isPending || removeCouponMutation.isPending;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-gray-400">
        Đang tải giỏ hàng...
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-xl text-gray-500">Giỏ hàng của bạn đang trống</p>
        <Link
          href="http://localhost:3002/products"
          className="mt-4 inline-block rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Giỏ hàng ({cart.items.length} sản phẩm)</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            {cart.items.map((item) => (
              <CartItemRow
                key={item.productId}
                item={item}
                onUpdateQuantity={(pid, qty) => updateMutation.mutate({ productId: pid, quantity: qty })}
                onRemove={(pid) => removeMutation.mutate(pid)}
                isPending={isPending}
              />
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          {/* Coupon */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Mã giảm giá</h2>
            {cart.couponCode ? (
              <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2">
                <div>
                  <span className="text-sm font-medium text-green-700">{cart.couponCode}</span>
                  <span className="ml-2 text-xs text-green-600">
                    − {formatVND(cart.discountVnd)}
                  </span>
                </div>
                <button
                  onClick={() => removeCouponMutation.mutate()}
                  disabled={isPending}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                >
                  Xóa
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                  placeholder="Nhập mã giảm giá"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
                <button
                  disabled={isPending || !couponInput.trim()}
                  onClick={() => couponMutation.mutate(couponInput.trim())}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Áp dụng
                </button>
              </div>
            )}
            {couponError && <p className="mt-1 text-xs text-red-600">{couponError}</p>}
          </div>

          {/* Order total */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Tóm tắt đơn hàng</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>{formatVND(cart.subtotalVnd)}</span>
              </div>
              {cart.discountVnd > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá</span>
                  <span>− {formatVND(cart.discountVnd)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold text-gray-900">
                <span>Tổng cộng</span>
                <span className="text-indigo-600">{formatVND(cart.totalVnd)}</span>
              </div>
            </div>
            <Link
              href="http://localhost:3005/checkout"
              className="mt-4 block w-full rounded-md bg-indigo-600 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Tiến hành thanh toán
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
