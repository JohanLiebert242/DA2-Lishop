'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { formatVND } from '@lishop/shared';
import { checkoutApi, AddressInfo, CreateAddressInput } from '../../lib/checkout-api';

const SHIPPING_FEE = 30000;

function AddressCard({
  address,
  selected,
  onSelect,
}: {
  address: AddressInfo;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-lg border-2 p-3 transition-colors ${
        selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {address.fullName}
            {address.isDefault && (
              <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700">
                Mặc định
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{address.phone}</p>
          <p className="text-xs text-gray-600 mt-1">
            {address.street}, {address.district}, {address.city}
          </p>
        </div>
        {selected && (
          <span className="text-indigo-600 text-lg">✓</span>
        )}
      </div>
    </button>
  );
}

function NewAddressForm({ onSave }: { onSave: (data: CreateAddressInput) => void }) {
  const [form, setForm] = useState<CreateAddressInput>({
    fullName: '', phone: '', street: '', district: '', city: '', country: 'VN',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  const field = (key: keyof CreateAddressInput, label: string, placeholder: string) => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        required
        value={form[key] ?? ''}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-lg border border-dashed border-gray-300 p-3">
      <p className="text-xs font-semibold text-gray-700">Địa chỉ mới</p>
      {field('fullName', 'Họ tên', 'Nguyễn Văn A')}
      {field('phone', 'Số điện thoại', '0901234567')}
      {field('street', 'Địa chỉ', '123 Đường ABC')}
      {field('district', 'Quận/Huyện', 'Quận 1')}
      {field('city', 'Tỉnh/Thành phố', 'Hồ Chí Minh')}
      <button
        type="submit"
        className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
      >
        Lưu địa chỉ
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const { data: cart, isLoading: cartLoading } = useQuery({
    queryKey: ['checkout-cart'],
    queryFn: () => checkoutApi.getCart(),
  });

  const { data: addresses = [], refetch: refetchAddresses } = useQuery({
    queryKey: ['checkout-addresses'],
    queryFn: () => checkoutApi.getAddresses(),
  });

  useEffect(() => {
    if (!selectedAddressId && addresses.length > 0) {
      const list = addresses as AddressInfo[];
      const def = list.find((a) => a.isDefault) ?? list[0];
      if (def) setSelectedAddressId(def.id);
    }
  }, [addresses, selectedAddressId]);

  const createAddressMutation = useMutation({
    mutationFn: (data: CreateAddressInput) => checkoutApi.createAddress(data),
    onSuccess: (addr) => {
      refetchAddresses();
      setSelectedAddressId(addr.id);
      setShowNewAddress(false);
    },
  });

  const placeOrderMutation = useMutation({
    mutationFn: () => {
      if (!selectedAddressId) throw new Error('Vui lòng chọn địa chỉ giao hàng');
      return checkoutApi.placeOrder(selectedAddressId, 'COD', notes || undefined);
    },
    onSuccess: (order) => {
      window.location.href = `http://localhost:3005/orders/${order.id}`;
    },
    onError: (err: Error) => setError(err.message),
  });

  if (cartLoading) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-center text-gray-400">Đang tải...</div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-gray-500">Giỏ hàng trống. Không thể thanh toán.</p>
        <a href="http://localhost:3002/products" className="mt-4 inline-block text-indigo-600 hover:underline text-sm">
          ← Quay lại mua sắm
        </a>
      </div>
    );
  }

  const subtotal = cart.subtotalVnd;
  const discount = cart.discountVnd;
  const shipping = SHIPPING_FEE;
  const total = subtotal + shipping - discount;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Thanh toán</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: address + notes */}
        <div className="lg:col-span-3 space-y-4">
          {/* Shipping address */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Địa chỉ giao hàng</h2>
            <div className="space-y-2">
              {(addresses as AddressInfo[]).map((addr) => (
                <AddressCard
                  key={addr.id}
                  address={addr}
                  selected={selectedAddressId === addr.id}
                  onSelect={() => setSelectedAddressId(addr.id)}
                />
              ))}
            </div>
            {!showNewAddress ? (
              <button
                onClick={() => setShowNewAddress(true)}
                className="mt-2 text-xs text-indigo-600 hover:underline"
              >
                + Thêm địa chỉ mới
              </button>
            ) : (
              <NewAddressForm onSave={(data) => createAddressMutation.mutate(data)} />
            )}
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Ghi chú đơn hàng</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú cho người giao hàng (tùy chọn)..."
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none"
            />
          </div>

          {/* Payment method */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Phương thức thanh toán</h2>
            <div className="flex items-center gap-2 rounded-lg border-2 border-indigo-500 bg-indigo-50 px-3 py-2">
              <span className="text-lg">💵</span>
              <span className="text-sm font-medium text-indigo-700">Thanh toán khi nhận hàng (COD)</span>
            </div>
          </div>
        </div>

        {/* Right: order summary */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sticky top-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Đơn hàng ({cart.items.length} sản phẩm)
            </h2>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cart.items.map((item) => (
                <div key={item.productId} className="flex justify-between text-xs text-gray-700">
                  <span className="line-clamp-1 flex-1">{item.productName} × {item.quantity}</span>
                  <span className="ml-2 shrink-0 font-medium">{formatVND(item.priceVnd * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-1.5 border-t pt-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>{formatVND(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Phí vận chuyển</span>
                <span>{formatVND(shipping)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá {cart.couponCode && `(${cart.couponCode})`}</span>
                  <span>− {formatVND(discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-bold text-gray-900">
                <span>Tổng cộng</span>
                <span className="text-indigo-600">{formatVND(total)}</span>
              </div>
            </div>

            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

            <button
              disabled={!selectedAddressId || placeOrderMutation.isPending}
              onClick={() => { setError(''); placeOrderMutation.mutate(); }}
              className="mt-4 w-full rounded-md bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {placeOrderMutation.isPending ? 'Đang đặt hàng...' : 'Đặt hàng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
