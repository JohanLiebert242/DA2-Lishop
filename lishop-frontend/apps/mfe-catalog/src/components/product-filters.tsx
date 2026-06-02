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
  const hasActiveFilters = Boolean(
    q || brand || minPriceVnd || maxPriceVnd || minRating || inStock || onSale || freeShipping || sort !== 'newest',
  );

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
          placeholder="Tim kiem..."
          className="input-field w-48 py-2 pl-8 pr-4 text-sm"
        />
      </div>

      <select
        value={brand}
        onChange={e => onBrandChange(e.target.value)}
        className="input-field min-w-36 py-2 pr-8 text-sm font-medium"
      >
        <option value="">Thuong hieu</option>
        {BRAND_OPTIONS.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>

      <div className="flex items-center overflow-hidden rounded-lg border border-stone-200 bg-white">
        <input
          type="number"
          min="0"
          inputMode="numeric"
          value={minPriceVnd}
          onChange={e => onMinPriceChange(e.target.value)}
          placeholder="Gia tu"
          className="w-24 border-0 bg-transparent px-3 py-2 text-sm outline-none"
        />
        <span className="h-5 w-px bg-stone-200" />
        <input
          type="number"
          min="0"
          inputMode="numeric"
          value={maxPriceVnd}
          onChange={e => onMaxPriceChange(e.target.value)}
          placeholder="den"
          className="w-24 border-0 bg-transparent px-3 py-2 text-sm outline-none"
        />
      </div>

      <select
        value={minRating}
        onChange={e => onMinRatingChange(e.target.value)}
        className="input-field py-2 pr-8 text-sm font-medium"
      >
        <option value="">Danh gia</option>
        <option value="5">5 sao</option>
        <option value="4">Tu 4 sao</option>
        <option value="3">Tu 3 sao</option>
        <option value="2">Tu 2 sao</option>
        <option value="1">Tu 1 sao</option>
      </select>

      <div className="relative">
        <select
          value={sort}
          onChange={e => onSortChange(e.target.value)}
          className="input-field cursor-pointer appearance-none py-2 pr-8 text-sm font-medium"
        >
          <option value="newest">Moi nhat</option>
          <option value="price_asc">Gia tang dan</option>
          <option value="price_desc">Gia giam dan</option>
          <option value="rating_desc">Danh gia cao nhat</option>
        </select>
        <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700">
        <input type="checkbox" checked={onSale} onChange={e => onOnSaleChange(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
        Dang giam gia
      </label>

      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700">
        <input type="checkbox" checked={freeShipping} onChange={e => onFreeShippingChange(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
        Mien phi ship
      </label>

      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700">
        <input type="checkbox" checked={inStock} onChange={e => onInStockChange(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
        Co san
      </label>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-white"
        >
          Xoa loc
        </button>
      )}
    </div>
  );
}
