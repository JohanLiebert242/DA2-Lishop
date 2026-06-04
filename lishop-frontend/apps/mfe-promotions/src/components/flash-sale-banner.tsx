'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatVND } from '@lishop/shared';
import type { FlashSaleInfo } from '../lib/promotions-api';

function useCountdown(endAt: string) {
  const getRemaining = () => Math.max(0, Math.floor((new Date(endAt).getTime() - Date.now()) / 1000));
  const [seconds, setSeconds] = useState(getRemaining);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => setSeconds(getRemaining()), 1000);
    return () => clearInterval(timer);
  }, [endAt]);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return { h, m, s, expired: seconds <= 0 };
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="rounded bg-red-600 px-2 py-1 text-lg font-bold text-white tabular-nums">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1 text-xs text-gray-500">{label}</span>
    </div>
  );
}

export function FlashSaleBanner({ sale }: { sale: FlashSaleInfo }) {
  const { h, m, s, expired } = useCountdown(sale.endAt);

  if (expired) return null;

  return (
    <div className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">⚡ Flash Sale</h3>
          <p className="text-sm text-red-100">Kết thúc sau</p>
        </div>
        <div data-testid="section-countdown" className="flex items-end gap-1.5">
          <TimeBlock value={h} label="giờ" />
          <span className="mb-3 text-xl font-bold">:</span>
          <TimeBlock value={m} label="phút" />
          <span className="mb-3 text-xl font-bold">:</span>
          <TimeBlock value={s} label="giây" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {sale.items.map((item) => {
          const image = item.product.images[0];
          const salePrice = Math.floor(item.product.priceVnd * (1 - item.discountPercent / 100));
          return (
            <Link
              key={item.id}
              href={`http://localhost:3002/products/${item.product.slug}`}
              className="group rounded-lg bg-white/10 p-2 transition-colors hover:bg-white/20"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-md bg-white/20">
                {image ? (
                  <Image src={image.url} alt={item.product.name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-white/50 text-xs">No img</div>
                )}
                <span className="absolute top-1 right-1 rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold">
                  -{item.discountPercent}%
                </span>
              </div>
              <p className="mt-1.5 line-clamp-1 text-xs font-medium text-white">{item.product.name}</p>
              <p className="text-xs font-bold text-yellow-300">{formatVND(salePrice)}</p>
              <p className="text-xs text-red-200 line-through">{formatVND(item.product.priceVnd)}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
