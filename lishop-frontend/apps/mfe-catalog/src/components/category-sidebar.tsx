'use client';

import type { CategoryItem } from '../lib/catalog-api';

interface CategorySidebarProps {
  categories: CategoryItem[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
}

export function CategorySidebar({ categories, selectedId, onSelect }: CategorySidebarProps) {
  return (
    <aside className="w-48 shrink-0">
      <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">Danh mục</h2>
      <ul className="space-y-1">
        <li>
          <button
            onClick={() => onSelect(undefined)}
            className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
              !selectedId ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Tất cả
          </button>
        </li>
        {categories.map((cat) => (
          <li key={cat.id}>
            <button
              onClick={() => onSelect(cat.id)}
              className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                selectedId === cat.id ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {cat.name}
            </button>
            {cat.children && cat.children.length > 0 && (
              <ul className="ml-3 mt-1 space-y-1">
                {cat.children.map((child) => (
                  <li key={child.id}>
                    <button
                      onClick={() => onSelect(child.id)}
                      className={`w-full rounded px-3 py-2 text-left text-xs transition-colors ${
                        selectedId === child.id ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-gray-500 hover:bg-gray-50'
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
    </aside>
  );
}
