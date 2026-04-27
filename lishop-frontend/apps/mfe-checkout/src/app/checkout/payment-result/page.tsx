'use client';
import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function PaymentResultContent() {
  const params = useSearchParams();
  const success = params.get('success') === 'true';
  const orderId = params.get('orderId') ?? '';

  useEffect(() => {
    const t = setTimeout(() => {
      window.location.href = orderId
        ? `http://localhost:3005/orders/${orderId}`
        : 'http://localhost:3005/orders';
    }, 4000);
    return () => clearTimeout(t);
  }, [orderId]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-full text-4xl ${
          success ? 'bg-green-100' : 'bg-red-100'
        }`}
      >
        {success ? '✓' : '✕'}
      </div>
      <div>
        <h1
          className={`text-2xl font-bold ${success ? 'text-green-700' : 'text-red-700'}`}
        >
          {success ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
        </h1>
        <p className="mt-2 text-gray-500">
          {success
            ? 'Đơn hàng của bạn đã được xác nhận. Đang chuyển đến trang đơn hàng...'
            : 'Đã xảy ra lỗi trong quá trình thanh toán. Đang chuyển đến trang đơn hàng...'}
        </p>
      </div>
      <a
        href={
          orderId
            ? `http://localhost:3005/orders/${orderId}`
            : 'http://localhost:3005/orders'
        }
        className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Xem đơn hàng ngay
      </a>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Đang xử lý...
        </div>
      }
    >
      <PaymentResultContent />
    </Suspense>
  );
}
