'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { promotionsApi, type PublicCoupon } from '../../lib/promotions-api';
import { FlashSaleBanner } from '../../components/flash-sale-banner';
import { CouponWidget } from '../../components/coupon-widget';

function couponDescription(coupon: PublicCoupon): string {
  if (coupon.type === 'PERCENT') {
    return `Giam ${coupon.value}%${
      coupon.minOrderVnd > 0 ? ` - Don tu ${(coupon.minOrderVnd / 1000).toFixed(0)}K` : ''
    }`;
  }

  if (coupon.type === 'FIXED') {
    return `Giam ${(coupon.value / 1000).toFixed(0)}K${
      coupon.minOrderVnd > 0 ? ` - Don tu ${(coupon.minOrderVnd / 1000).toFixed(0)}K` : ''
    }`;
  }

  return 'Mien phi giao hang';
}

export default function PromotionsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState('');

  const { data: flashSales = [], isLoading } = useQuery({
    queryKey: ['flash-sales-active'],
    queryFn: () => promotionsApi.getActiveFlashSales(),
    refetchInterval: 1_000,
  });

  const { data: coupons = [] } = useQuery({
    queryKey: ['public-coupons'],
    queryFn: () => promotionsApi.getPublicCoupons(),
    staleTime: 60_000,
  });

  async function copyCoupon(code: string) {
    try {
      await navigator.clipboard?.writeText(code);
    } catch {
      // Browsers can block clipboard writes in tests or private contexts.
    }

    setCopiedCode(code);
    setCopyMessage(`Da copy ma ${code}`);
  }

  return (
    <div className="min-h-screen bg-warm">
      {copyMessage && (
        <div
          role="status"
          className="fixed right-4 top-4 z-50 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 shadow-lg"
        >
          {copyMessage}
        </div>
      )}

      <div
        className="relative overflow-hidden py-12 text-center text-white"
        style={{ background: 'linear-gradient(135deg, #dc2626 0%, #7c3aed 50%, #4f46e5 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-bold">
            <span className="h-2 w-2 rounded-full bg-red-300 animate-pulse" />
            DANG DIEN RA
          </span>
          <h1 className="text-4xl font-black tracking-tight">Flash Sale & Khuyen mai</h1>
          <p className="mt-2 text-white/80">Uu dai len den 25% - So luong co han</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
                Su kien: Flash Sale dang chay
              </p>
              <h2 className="mt-1 flex items-center gap-2 text-xl font-black tracking-tight text-stone-900">
                Flash Sale dang chay ({flashSales.length} dot)
              </h2>
            </div>

            {isLoading && (
              <div className="space-y-4">
                {[1, 2].map((item) => (
                  <div key={item} className="card h-40 animate-pulse bg-stone-50" />
                ))}
              </div>
            )}

            {!isLoading && flashSales.length === 0 && (
              <div className="card flex flex-col items-center justify-center gap-4 py-16 text-center">
                <span className="text-5xl">...</span>
                <div>
                  <p className="font-bold text-stone-700">Chua co flash sale nao</p>
                  <p className="mt-1 text-sm text-muted">
                    Flash sale dien ra hang ngay luc 12:00 va 20:00
                  </p>
                </div>
              </div>
            )}

            {flashSales.map((sale) => (
              <FlashSaleBanner key={sale.id} sale={sale} />
            ))}
          </div>

          <div className="space-y-5">
            <CouponWidget />

            <div className="card p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-black text-stone-900">
                Huong dan su dung ma
              </h3>
              <ol className="space-y-3">
                {[
                  { step: '1', text: 'Them san pham vao gio hang' },
                  { step: '2', text: 'Nhap ma giam gia o trang gio hang' },
                  { step: '3', text: 'Giam gia tu dong ap dung' },
                  { step: '4', text: 'Hoan tat thanh toan' },
                ].map((item) => (
                  <li key={item.step} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">
                      {item.step}
                    </span>
                    <span className="text-sm leading-relaxed text-stone-600">{item.text}</span>
                  </li>
                ))}
              </ol>
            </div>

            {coupons.length > 0 && (
              <div className="card bg-gradient-to-br from-indigo-50 to-violet-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
                  Su kien: Ma giam gia hot
                </p>
                <h3 className="mb-3 mt-1 text-sm font-black text-stone-900">
                  Ma giam gia hot ({coupons.length} ma)
                </h3>
                <div className="space-y-2.5">
                  {coupons.map((coupon) => (
                    <div
                      key={coupon.id}
                      data-testid={`coupon-card-${coupon.code}`}
                      className="flex items-center justify-between rounded-xl border border-warm bg-white px-3 py-2.5 shadow-sm"
                    >
                      <div>
                        <p className="text-xs font-black tracking-widest text-indigo-700">
                          {coupon.code}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">{couponDescription(coupon)}</p>
                      </div>
                      <button
                        onClick={() => copyCoupon(coupon.code)}
                        className={`ml-2 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                          copiedCode === coupon.code
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        {copiedCode === coupon.code ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
