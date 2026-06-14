'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

const METHOD_LABELS: Record<string, string> = {
  VNPAY: 'VNPay',
  MOMO: 'MoMo',
  ZALOPAY: 'ZaloPay',
};

function PaymentSimulatorContent() {
  const params = useSearchParams();
  const orderId = params.get('orderId') ?? '';
  const method = (params.get('method') ?? '').toUpperCase();

  const methodLabel = useMemo(
    () => (METHOD_LABELS[method] ?? method) || 'Cổng thanh toán',
    [method],
  );

  const successHref = orderId
    ? `${API_URL}/payments/mock/return?${new URLSearchParams({ orderId, success: 'true' }).toString()}`
    : '';
  const failureHref = orderId
    ? `${API_URL}/payments/mock/return?${new URLSearchParams({ orderId, success: 'false' }).toString()}`
    : '';

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-4 py-10">
      <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Mock gateway</p>
            <h1 className="mt-1 text-3xl font-black text-stone-900">Mô phỏng thanh toán</h1>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
            {methodLabel}
          </span>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
          <p><span className="font-semibold">Đơn hàng:</span> {orderId || 'Không xác định'}</p>
          <p className="mt-2">
            Chọn kết quả thanh toán để mô phỏng luồng quay về từ cổng thanh toán trong môi trường local.
          </p>
        </div>

        {!orderId && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            Không tìm thấy đơn hàng để mô phỏng thanh toán.
          </p>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a
            href={successHref || undefined}
            aria-disabled={!successHref}
            className={`rounded-2xl px-5 py-4 text-center text-sm font-bold text-white transition ${
              successHref
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'pointer-events-none bg-emerald-300'
            }`}
          >
            Thanh toán thành công
          </a>
          <a
            href={failureHref || undefined}
            aria-disabled={!failureHref}
            className={`rounded-2xl border px-5 py-4 text-center text-sm font-bold transition ${
              failureHref
                ? 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
                : 'pointer-events-none border-stone-200 bg-stone-100 text-stone-400'
            }`}
          >
            Thanh toán thất bại
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSimulatorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-stone-500">
          Đang tải mô phỏng thanh toán...
        </div>
      }
    >
      <PaymentSimulatorContent />
    </Suspense>
  );
}
