'use client';

import { useQuery } from '@tanstack/react-query';
import { promotionsApi } from '../../lib/promotions-api';
import { FlashSaleBanner } from '../../components/flash-sale-banner';
import { CouponWidget } from '../../components/coupon-widget';

function CountdownTimer({ endAt }: { endAt: string }) {
  const end = new Date(endAt).getTime();
  const now = Date.now();
  const diff = Math.max(0, end - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return (
    <div className="flex items-center gap-1.5">
      {[h, m, s].map((v, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="flex h-9 w-10 items-center justify-center rounded-xl bg-stone-900 text-base font-black text-white tabular-nums">
            {String(v).padStart(2, '0')}
          </span>
          {i < 2 && <span className="text-base font-black text-stone-600">:</span>}
        </span>
      ))}
    </div>
  );
}

export default function PromotionsPage() {
  const { data: flashSales = [], isLoading } = useQuery({
    queryKey: ['flash-sales-active'],
    queryFn: () => promotionsApi.getActiveFlashSales(),
    refetchInterval: 1_000,
  });

  const activeSale = flashSales[0];

  return (
    <div className="min-h-screen bg-warm">
      {/* Hero banner */}
      <div
        className="relative overflow-hidden py-12 text-white text-center"
        style={{ background: 'linear-gradient(135deg, #dc2626 0%, #7c3aed 50%, #4f46e5 100%)' }}
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="relative mx-auto max-w-3xl px-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-bold mb-4">
            <span className="h-2 w-2 rounded-full bg-red-300 animate-pulse" />
            ĐANG DIỄN RA
          </span>
          <h1 className="text-4xl font-black tracking-tight">🔥 Flash Sale & Khuyến mãi</h1>
          <p className="mt-2 text-white/80">Ưu đãi lên đến 25% · Số lượng có hạn</p>
          {activeSale && (
            <div className="mt-5 flex flex-col items-center gap-2">
              <p className="text-sm font-semibold text-white/80">Kết thúc sau:</p>
              <CountdownTimer endAt={activeSale.endAt} />
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main: flash sales */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
              ⚡ Flash Sale đang chạy
            </h2>

            {isLoading && (
              <div className="space-y-4">
                {[1,2].map(i => (
                  <div key={i} className="card h-40 animate-pulse bg-stone-50" />
                ))}
              </div>
            )}

            {!isLoading && flashSales.length === 0 && (
              <div className="card flex flex-col items-center justify-center py-16 text-center gap-4">
                <span className="text-5xl">⏳</span>
                <div>
                  <p className="font-bold text-stone-700">Chưa có flash sale nào</p>
                  <p className="mt-1 text-sm text-muted">Flash sale diễn ra hàng ngày lúc 12:00 và 20:00</p>
                </div>
              </div>
            )}

            {flashSales.map(sale => (
              <FlashSaleBanner key={sale.id} sale={sale} />
            ))}
          </div>

          {/* Sidebar: coupons + guide */}
          <div className="space-y-5">
            <CouponWidget />

            {/* How to use */}
            <div className="card p-5">
              <h3 className="mb-4 font-black text-stone-900 text-sm flex items-center gap-2">
                📋 Hướng dẫn sử dụng mã
              </h3>
              <ol className="space-y-3">
                {[
                  { step: '1', text: 'Thêm sản phẩm vào giỏ hàng' },
                  { step: '2', text: 'Nhập mã giảm giá ở trang giỏ hàng' },
                  { step: '3', text: 'Giảm giá tự động áp dụng' },
                  { step: '4', text: 'Hoàn tất thanh toán' },
                ].map(item => (
                  <li key={item.step} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">
                      {item.step}
                    </span>
                    <span className="text-sm text-stone-600 leading-relaxed">{item.text}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Active coupons highlight */}
            <div className="card p-5 bg-gradient-to-br from-indigo-50 to-violet-50">
              <h3 className="mb-3 font-black text-stone-900 text-sm">🎫 Mã giảm giá hot</h3>
              <div className="space-y-2.5">
                {[
                  { code: 'WELCOME10', desc: 'Giảm 10% · Đơn từ 500K' },
                  { code: 'FREESHIP',  desc: 'Miễn phí giao hàng' },
                  { code: 'VIP20',     desc: 'Giảm 20% · Đơn từ 2 triệu' },
                ].map(c => (
                  <div key={c.code} className="flex items-center justify-between rounded-xl bg-white border border-warm px-3 py-2.5 shadow-sm">
                    <div>
                      <p className="text-xs font-black text-indigo-700 tracking-widest">{c.code}</p>
                      <p className="text-xs text-muted mt-0.5">{c.desc}</p>
                    </div>
                    <button
                      onClick={() => navigator.clipboard?.writeText(c.code)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors ml-2"
                    >
                      Sao chép
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
