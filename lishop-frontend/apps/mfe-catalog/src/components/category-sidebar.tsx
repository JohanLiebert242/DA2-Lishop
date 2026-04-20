'use client';

import type { CategoryItem } from '../lib/catalog-api';

interface CategorySidebarProps {
  categories: CategoryItem[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
}

export function CategorySidebar({ categories, selectedId, onSelect }: CategorySidebarProps) {
  return (
    <aside className="w-52 shrink-0">
      <div className="rounded-2xl bg-white border border-warm p-4 shadow-sm">
        <h2 className="mb-3 text-xs font-black text-stone-500 uppercase tracking-widest">Danh mục</h2>
        <ul className="space-y-0.5">
          <li>
            <button
              onClick={() => onSelect(undefined)}
              className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                !selectedId
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              🛍️ Tất cả
            </button>
          </li>
          {categories.map(cat => (
            <li key={cat.id}>
              <button
                onClick={() => onSelect(cat.id)}
                className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                  selectedId === cat.id
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                {cat.name}
              </button>
              {cat.children && cat.children.length > 0 && (
                <ul className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-stone-100 pl-3">
                  {cat.children.map(child => (
                    <li key={child.id}>
                      <button
                        onClick={() => onSelect(child.id)}
                        className={`w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-all ${
                          selectedId === child.id
                            ? 'text-indigo-600 font-semibold'
                            : 'text-stone-500 hover:text-stone-800'
                        }`}
                      >
                        {child.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
