'use client';

const BRAND_OPTIONS = [
  'Apple',
  'Samsung',
  'Xiaomi',
  'OPPO',
  'Google',
  'ASUS',
  'Dell',
  'Nike',
  "Levi's",
  'Zara',
  'Philips',
  'Kiehl',
  'The Ordinary',
  'La Roche Posay',
];

const PRICE_MIN = 0;
const PRICE_MAX = 50_000_000;
const PRICE_STEP = 500_000;

function formatCompactVnd(value: number) {
  if (value >= 1_000_000) return `${value / 1_000_000}tr`;
  if (value >= 1_000) return `${value / 1_000}k`;
  return `${value}`;
}

interface ProductFiltersProps {
  sort: string;
  q: string;
  brand: string;
  minPriceVnd: string;
  maxPriceVnd: string;
  minRating: string;
  inStock: boolean;
  onSale: boolean;
  freeShipping: boolean;
  onSortChange: (sort: string) => void;
  onQChange: (q: string) => void;
  onBrandChange: (brand: string) => void;
  onMinPriceChange: (price: string) => void;
  onMaxPriceChange: (price: string) => void;
  onMinRatingChange: (rating: string) => void;
  onInStockChange: (enabled: boolean) => void;
  onOnSaleChange: (enabled: boolean) => void;
  onFreeShippingChange: (enabled: boolean) => void;
  onReset: () => void;
}

export function ProductFilters({
  sort,
  q,
  brand,
  minPriceVnd,
  maxPriceVnd,
  minRating,
  inStock,
  onSale,
  freeShipping,
  onSortChange,
  onQChange,
  onBrandChange,
  onMinPriceChange,
  onMaxPriceChange,
  onMinRatingChange,
  onInStockChange,
  onOnSaleChange,
  onFreeShippingChange,
  onReset,
}: ProductFiltersProps) {
  const minPriceNumber = minPriceVnd ? Number(minPriceVnd) : PRICE_MIN;
  const maxPriceNumber = maxPriceVnd ? Number(maxPriceVnd) : PRICE_MAX;
  const hasActiveFilters = Boolean(
    q || brand || minPriceVnd || maxPriceVnd || minRating || inStock || onSale || freeShipping || sort !== 'newest',
  );

  function handleMinPrice(value: string) {
    const nextValue = Math.min(Number(value), maxPriceNumber);
    onMinPriceChange(nextValue <= PRICE_MIN ? '' : String(nextValue));
  }

  function handleMaxPrice(value: string) {
    const nextValue = Math.max(Number(value), minPriceNumber);
    onMaxPriceChange(nextValue >= PRICE_MAX ? '' : String(nextValue));
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2.5">
      <div className="relative">
        <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={q}
          onChange={e => onQChange(e.target.value)}
          placeholder="Tìm kiếm..."
          className="input-field w-48 py-2 pl-8 pr-4 text-sm"
        />
      </div>

      <select
        value={brand}
        onChange={e => onBrandChange(e.target.value)}
        className="input-field min-w-36 py-2 pr-8 text-sm font-medium"
      >
        <option value="">Thương hiệu</option>
        {BRAND_OPTIONS.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>

      <div className="min-w-64 rounded-lg border border-stone-200 bg-white px-3 py-2">
        <div className="mb-1 flex items-center justify-between gap-3 text-xs font-bold text-stone-600">
          <span>Giá</span>
          <span>{formatCompactVnd(minPriceNumber)} - {formatCompactVnd(maxPriceNumber)}</span>
        </div>
        <div className="grid gap-1">
          <input
            type="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            value={minPriceNumber}
            onChange={e => handleMinPrice(e.target.value)}
            className="h-2 cursor-pointer accent-indigo-600"
            aria-label="Giá tối thiểu"
          />
          <input
            type="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            value={maxPriceNumber}
            onChange={e => handleMaxPrice(e.target.value)}
            className="h-2 cursor-pointer accent-indigo-600"
            aria-label="Giá tối đa"
          />
        </div>
      </div>

      <div className="flex items-center overflow-hidden rounded-lg border border-stone-200 bg-white">
        {[1, 2, 3, 4, 5].map((star) => {
          const selected = minRating === String(star);

          return (
            <button
              key={star}
              type="button"
              onClick={() => onMinRatingChange(selected ? '' : String(star))}
              className={`h-9 w-9 border-r border-stone-100 text-sm font-bold transition last:border-r-0 ${
                selected ? 'bg-yellow-50 text-yellow-500' : 'text-stone-400 hover:bg-yellow-50 hover:text-yellow-500'
              }`}
              aria-label={`${star} sao`}
            >
              {star}★
            </button>
          );
        })}
      </div>

      <div className="relative">
        <select
          value={sort}
          onChange={e => onSortChange(e.target.value)}
          className="input-field cursor-pointer appearance-none py-2 pr-8 text-sm font-medium"
        >
          <option value="newest">Mới nhất</option>
          <option value="price_asc">Giá tăng dần</option>
          <option value="price_desc">Giá giảm dần</option>
          <option value="rating_desc">Đánh giá cao nhất</option>
        </select>
        <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700">
        <input type="checkbox" checked={onSale} onChange={e => onOnSaleChange(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
        Đang giảm giá
      </label>

      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700">
        <input type="checkbox" checked={freeShipping} onChange={e => onFreeShippingChange(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
        Miễn phí giao hàng
      </label>

      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700">
        <input type="checkbox" checked={inStock} onChange={e => onInStockChange(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
        Còn hàng
      </label>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-white"
        >
          Xóa lọc
        </button>
      )}
    </div>
  );
}
