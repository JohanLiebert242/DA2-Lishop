'use client';

interface ProductFiltersProps {
  sort: string;
  q: string;
  onSortChange: (sort: string) => void;
  onQChange: (q: string) => void;
}

export function ProductFilters({ sort, q, onSortChange, onQChange }: ProductFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={q}
          onChange={e => onQChange(e.target.value)}
          placeholder="Tìm kiếm..."
          className="input-field pl-8 pr-4 py-2 w-48 text-sm"
        />
      </div>

      {/* Sort */}
      <div className="relative">
        <select
          value={sort}
          onChange={e => onSortChange(e.target.value)}
          className="input-field py-2 pr-8 text-sm appearance-none cursor-pointer font-medium"
        >
          <option value="newest">Mới nhất</option>
          <option value="price_asc">Giá tăng dần</option>
          <option value="price_desc">Giá giảm dần</option>
          <option value="rating_desc">Đánh giá cao nhất</option>
        </select>
        <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
