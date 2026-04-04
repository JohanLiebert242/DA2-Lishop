'use client';

interface ProductFiltersProps {
  sort: string;
  q: string;
  onSortChange: (sort: string) => void;
  onQChange: (q: string) => void;
}

export function ProductFilters({ sort, q, onSortChange, onQChange }: ProductFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="text"
        value={q}
        onChange={(e) => onQChange(e.target.value)}
        placeholder="Tìm kiếm sản phẩm..."
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="newest">Mới nhất</option>
        <option value="price_asc">Giá tăng dần</option>
        <option value="price_desc">Giá giảm dần</option>
        <option value="rating_desc">Đánh giá cao nhất</option>
      </select>
    </div>
  );
}
