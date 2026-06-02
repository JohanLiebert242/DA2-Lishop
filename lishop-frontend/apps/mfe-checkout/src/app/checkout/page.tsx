'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { formatVND } from '@lishop/shared';
import {
  getCart,
  getAddresses,
  getShippingRates,
  placeOrder,
  getToken,
  type CartDto,
  type Address,
  type ShippingOption,
} from '../../lib/checkout-api';

const MFE_ORDERS = process.env['NEXT_PUBLIC_MFE_ORDERS_URL'] ?? 'http://localhost:3005';
const MFE_CATALOG = process.env['NEXT_PUBLIC_MFE_CATALOG_URL'] ?? 'http://localhost:3002';
const MFE_PROFILE = process.env['NEXT_PUBLIC_MFE_PROFILE_URL'] ?? 'http://localhost:3006';
const MFE_AUTH = process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001';

type Step = 1 | 2 | 3;

function formatVariantAttributes(attributes: Record<string, string> | null): string {
  return Object.entries(attributes ?? {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(' · ');
}

const STEP_LABELS: Record<Step, string> = {
  1: 'Giỏ hàng',
  2: 'Vận chuyển',
  3: 'Thanh toán',
};

const PAYMENT_OPTIONS = [
  { value: 'COD', label: 'Thanh toán khi nhận hàng', icon: '💵', desc: 'Trả tiền mặt khi nhận hàng' },
  { value: 'VNPAY', label: 'VNPay', icon: '🏦', desc: 'Thanh toán qua cổng VNPay' },
  { value: 'MOMO', label: 'MoMo', icon: '📱', desc: 'Thanh toán qua ví MoMo' },
  { value: 'ZALOPAY', label: 'ZaloPay', icon: '🟡', desc: 'Thanh toán qua ví ZaloPay' },
  { value: 'WALLET', label: 'Ví Lishop', icon: '💳', desc: 'Thanh toán bằng số dư ví Lishop' },
];

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-0">
      {([1, 2, 3] as Step[]).map((s, idx) => (
        <div key={s} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                s < current
                  ? 'bg-indigo-600 text-white'
                  : s === current
                  ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s < current ? '✓' : s}
            </div>
            <span
              className={`mt-1.5 text-xs font-medium ${
                s === current ? 'text-indigo-600' : s < current ? 'text-gray-500' : 'text-gray-300'
              }`}
            >
              {STEP_LABELS[s]}
            </span>
          </div>
          {idx < 2 && (
            <div
              className={`mb-4 h-0.5 w-16 sm:w-24 transition-colors ${
                s < current ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex animate-pulse gap-3 rounded-xl bg-gray-100 p-3">
          <div className="h-16 w-16 shrink-0 rounded-lg bg-gray-200" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-3/4 rounded bg-gray-200" />
            <div className="h-3 w-1/2 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CheckoutPage() {
  const [step, setStep] = useState<Step>(1);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('COD');
  const [notes, setNotes] = useState('');
  const [orderError, setOrderError] = useState('');

  // Auth redirect on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !getToken()) {
      window.location.href = `${MFE_AUTH}/login`;
    }
  }, []);

  // ── ALL QUERIES/MUTATIONS (must be unconditional) ─────────────────────────

  const { data: cart, isLoading: cartLoading } = useQuery({
    queryKey: ['checkout-cart'],
    queryFn: getCart,
  });

  const { data: addresses = [] } = useQuery({
    queryKey: ['checkout-addresses'],
    queryFn: getAddresses,
    enabled: step >= 2,
  });

  const selectedAddress = (addresses as Address[]).find((a) => a.id === selectedAddressId) ?? null;

  const totalWeightGrams =
    cart?.items.reduce((sum, item) => {
      const weight = item.weightGrams ?? 500;
      return sum + weight * item.quantity;
    }, 0) ?? 500;

  const { data: shippingRates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ['checkout-shipping-rates', selectedAddressId, totalWeightGrams],
    queryFn: () => getShippingRates(selectedAddress!.city, totalWeightGrams),
    enabled: step >= 2 && !!selectedAddress,
  });

  const ONLINE_PAYMENT_METHODS = ['VNPAY', 'MOMO', 'ZALOPAY'];

  const placeOrderMutation = useMutation({
    mutationFn: () => {
      if (!selectedAddressId) throw new Error('Vui lòng chọn địa chỉ giao hàng');
      if (!selectedProvider) throw new Error('Vui lòng chọn phương thức vận chuyển');
      return placeOrder({
        addressId: selectedAddressId,
        paymentMethod,
        shippingProvider: selectedProvider,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: async (result) => {
      if (ONLINE_PAYMENT_METHODS.includes(paymentMethod)) {
        try {
          const res = await fetch(
            `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'}/payments/${result.id}/initiate`,
            {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
            },
          );
          const json = await res.json();
          const paymentData = json.data ?? json;
          if (paymentData.paymentUrl) {
            window.location.href = paymentData.paymentUrl;
            return;
          }
        } catch {
          // If initiate fails, fall through to orders page
        }
      }
      window.location.href = `${MFE_ORDERS}/orders`;
    },
    onError: (err: Error) => setOrderError(err.message),
  });

  // ── SIDE EFFECTS (must be after all hooks) ────────────────────────────────

  // Auto-select default address
  useEffect(() => {
    if (!selectedAddressId && addresses.length > 0) {
      const addrList = addresses as Address[];
      const def = addrList.find((a) => a.isDefault) ?? addrList[0];
      if (def) setSelectedAddressId(def.id);
    }
  }, [addresses, selectedAddressId]);

  // Auto-select cheapest provider
  useEffect(() => {
    if (shippingRates.length > 0 && !selectedProvider) {
      const cheapest = (shippingRates as ShippingOption[]).reduce((a, b) =>
        a.feeVnd <= b.feeVnd ? a : b,
      );
      setSelectedProvider(cheapest.provider);
    }
  }, [shippingRates, selectedProvider]);

  // ── DERIVED VALUES ────────────────────────────────────────────────────────

  const selectedShipping =
    (shippingRates as ShippingOption[]).find((r) => r.provider === selectedProvider) ?? null;

  const subtotal = cart?.subtotalVnd ?? 0;
  const discount = cart?.discountVnd ?? 0;
  const shippingFee = selectedShipping?.feeVnd ?? 0;
  const total = subtotal + shippingFee - discount;

  // ── EARLY RETURNS (only after all hooks) ─────────────────────────────────

  if (cartLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <StepIndicator current={1} />
        <CartSkeleton />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-5xl">🛒</p>
        <p className="mt-4 text-lg font-semibold text-gray-700">Giỏ hàng trống</p>
        <p className="mt-2 text-sm text-gray-400">Thêm sản phẩm vào giỏ để tiến hành thanh toán</p>
        <a
          href={`${MFE_CATALOG}/products`}
          className="mt-5 inline-block rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Khám phá sản phẩm →
        </a>
      </div>
    );
  }

  // ── STEP RENDERERS ────────────────────────────────────────────────────────

  function renderStep1(cartData: CartDto) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Sản phẩm ({cartData.items.length})
          </h2>
          <div className="divide-y divide-gray-100">
            {cartData.items.map((item) => {
              const variantAttributes = formatVariantAttributes(item.variantAttributes);

              return (
              <div key={`${item.productId}:${item.variantId ?? 'base'}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-300">
                      Ảnh
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-gray-900">
                    {item.productName}
                  </p>
                  {(item.variantName || variantAttributes || item.variantSku) && (
                    <div className="mt-0.5 space-y-0.5">
                      {item.variantName && (
                        <p className="text-xs font-medium text-gray-600">{item.variantName}</p>
                      )}
                      {variantAttributes && (
                        <p className="text-xs text-gray-500">{variantAttributes}</p>
                      )}
                      {item.variantSku && (
                        <p className="text-[11px] text-gray-400">SKU: {item.variantSku}</p>
                      )}
                    </div>
                  )}
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatVND(item.priceVnd)} × {item.quantity}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-gray-900">
                  {formatVND(item.priceVnd * item.quantity)}
                </p>
              </div>
              );
            })}
          </div>
        </div>

        {/* Subtotal */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tạm tính</span>
            <span>{formatVND(cartData.subtotalVnd)}</span>
          </div>
          {cartData.discountVnd > 0 && (
            <div className="mt-2 flex justify-between text-sm text-green-600">
              <span>Giảm giá {cartData.couponCode ? `(${cartData.couponCode})` : ''}</span>
              <span>− {formatVND(cartData.discountVnd)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between text-sm font-semibold text-gray-400">
            <span>Phí vận chuyển</span>
            <span>Tính ở bước tiếp theo</span>
          </div>
        </div>

        <button
          onClick={() => setStep(2)}
          className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-[0.99] transition-all"
        >
          Tiếp tục →
        </button>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-4">
        {/* Address selection */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Địa chỉ giao hàng</h2>
          {(addresses as Address[]).length === 0 ? (
            <div className="rounded-lg bg-amber-50 p-4 text-center">
              <p className="text-sm font-medium text-amber-800">Chưa có địa chỉ giao hàng</p>
              <a
                href={`${MFE_PROFILE}/addresses`}
                className="mt-2 inline-block text-xs text-indigo-600 hover:underline"
              >
                Thêm địa chỉ trong trang tài khoản →
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {(addresses as Address[]).map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => {
                    setSelectedAddressId(addr.id);
                    setSelectedProvider(null); // reset provider when address changes
                  }}
                  className={`w-full rounded-lg border-2 p-3 text-left transition-colors ${
                    selectedAddressId === addr.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {addr.fullName}
                        {addr.isDefault && (
                          <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700">
                            Mặc định
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">{addr.phone}</p>
                      <p className="mt-1 text-xs text-gray-600">
                        {addr.street}, {addr.district}, {addr.city}
                      </p>
                    </div>
                    {selectedAddressId === addr.id && (
                      <span className="text-lg text-indigo-600">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Shipping provider selection */}
        {selectedAddress && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Phương thức vận chuyển</h2>
            {ratesLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(shippingRates as ShippingOption[]).map((rate) => (
                  <button
                    key={rate.provider}
                    onClick={() => setSelectedProvider(rate.provider)}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${
                      selectedProvider === rate.provider
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">{rate.name}</p>
                    <p className="mt-1 text-xs text-gray-500">{rate.estimatedDays}</p>
                    <p className="mt-1.5 text-sm font-bold text-indigo-600">{formatVND(rate.feeVnd)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setStep(1)}
            className="flex-1 rounded-xl border border-gray-300 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ← Quay lại
          </button>
          <button
            onClick={() => setStep(3)}
            disabled={!selectedAddressId || !selectedProvider}
            className="flex-1 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-all active:scale-[0.99]"
          >
            Tiếp tục →
          </button>
        </div>
      </div>
    );
  }

  function renderStep3(cartData: CartDto) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: payment method + notes */}
        <div className="space-y-4 lg:col-span-3">
          {/* Payment method */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Phương thức thanh toán</h2>
            <div className="space-y-2">
              {PAYMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPaymentMethod(opt.value)}
                  className={`flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors ${
                    paymentMethod === opt.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                  {paymentMethod === opt.value && (
                    <span className="ml-auto text-lg text-indigo-600">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold text-gray-900">Ghi chú đơn hàng</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder="Ghi chú cho người giao hàng (tùy chọn)..."
              rows={3}
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{notes.length}/500</p>
          </div>
        </div>

        {/* Right: order summary */}
        <div className="lg:col-span-2">
          <div className="sticky top-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Tóm tắt đơn hàng ({cartData.items.length} sản phẩm)
            </h2>

            <div className="max-h-40 space-y-1.5 overflow-y-auto">
              {cartData.items.map((item) => (
                <div key={`${item.productId}:${item.variantId ?? 'base'}`} className="flex justify-between text-xs text-gray-600">
                  <span className="line-clamp-1 flex-1">
                    {item.productName}
                    {item.variantName ? ` - ${item.variantName}` : ''}
                    {' × '}
                    {item.quantity}
                  </span>
                  <span className="ml-2 shrink-0 font-medium">
                    {formatVND(item.priceVnd * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>{formatVND(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Phí vận chuyển</span>
                <span>{formatVND(shippingFee)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>
                    Giảm giá{cartData.couponCode ? ` (${cartData.couponCode})` : ''}
                  </span>
                  <span>− {formatVND(discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-base font-bold text-gray-900">
                <span>Tổng cộng</span>
                <span className="text-indigo-600">{formatVND(total)}</span>
              </div>
            </div>

            {orderError && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{orderError}</p>
            )}

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ← Quay lại
              </button>
              <button
                onClick={() => {
                  setOrderError('');
                  placeOrderMutation.mutate();
                }}
                disabled={placeOrderMutation.isPending}
                className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-all active:scale-[0.99]"
              >
                {placeOrderMutation.isPending ? 'Đang đặt hàng...' : 'Đặt hàng'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN RENDER ───────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <StepIndicator current={step} />

      {step === 1 && renderStep1(cart)}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3(cart)}
    </div>
  );
}
