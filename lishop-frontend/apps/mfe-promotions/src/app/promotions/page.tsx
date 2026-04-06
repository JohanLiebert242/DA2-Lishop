'use client';

import { useQuery } from '@tanstack/react-query';
import { promotionsApi } from '../../lib/promotions-api';
import { FlashSaleBanner } from '../../components/flash-sale-banner';
import { CouponWidget } from '../../components/coupon-widget';

export default function PromotionsPage() {
  const { data: flashSales = [], isLoading } = useQuery({
    queryKey: ['flash-sales-active'],
    queryFn: () => promotionsApi.getActiveFlashSales(),
    refetchInterval: 60_000,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Khuyến mãi</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {isLoading && (
            <div className="rounded-xl bg-gray-100 h-40 animate-pulse" />
          )}
          {!isLoading && flashSales.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
              <p className="text-lg">Hiện không có flash sale nào</p>
              <p className="mt-1 text-sm">Quay lại sau để xem các ưu đãi mới nhất!</p>
            </div>
          )}
          {flashSales.map((sale) => (
            <FlashSaleBanner key={sale.id} sale={sale} />
          ))}
        </div>

        <div className="space-y-4">
          <CouponWidget />

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Hướng dẫn dùng mã</h3>
            <ol className="space-y-1.5 text-xs text-gray-600 list-decimal list-inside">
              <li>Thêm sản phẩm vào giỏ hàng</li>
              <li>Nhập mã giảm giá ở trên hoặc tại trang giỏ hàng</li>
              <li>Giảm giá được áp dụng tự động khi thanh toán</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
