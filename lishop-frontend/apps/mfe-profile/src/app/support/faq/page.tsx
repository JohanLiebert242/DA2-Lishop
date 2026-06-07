'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AccountSidebar } from '../../../components/account-sidebar';
import { getFaq, searchFaq, type FaqItem, type FaqGroup } from '../../../lib/support-api';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function FaqAccordionItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        data-testid="support-faq-item"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-800">{item.question}</span>
        <span className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const isSearching = debouncedSearch.trim().length > 0;

  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['faq'],
    queryFn: getFaq,
    enabled: !isSearching,
  });

  const { data: searchResults = [], isLoading: loadingSearch } = useQuery({
    queryKey: ['faq-search', debouncedSearch],
    queryFn: () => searchFaq(debouncedSearch.trim()),
    enabled: isSearching,
  });

  const isLoading = isSearching ? loadingSearch : loadingGroups;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-8">
      <AccountSidebar activeSection="support" />

      <div className="flex-1 min-w-0">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Câu hỏi thường gặp</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Tìm câu trả lời nhanh cho các thắc mắc phổ biến
            </p>
          </div>
          <Link
            href="/support"
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← Danh sách yêu cầu
          </Link>
        </div>

        {/* Search input */}
        <div className="mb-6 relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm câu hỏi..."
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : isSearching ? (
          /* Search results */
          searchResults.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
              <p className="text-4xl">🔍</p>
              <p className="mt-3 font-semibold text-gray-700">Không tìm thấy kết quả</p>
              <p className="mt-1 text-sm text-gray-400">
                Không tìm thấy câu trả lời cho &ldquo;{debouncedSearch}&rdquo;
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Kết quả tìm kiếm ({searchResults.length})
                </p>
              </div>
              {searchResults.map((item: FaqItem) => (
                <FaqAccordionItem key={item.id} item={item} />
              ))}
            </div>
          )
        ) : groups.length === 0 ? (
          /* No FAQ data */
          <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
            <p className="text-4xl">📭</p>
            <p className="mt-3 font-semibold text-gray-700">Chưa có câu hỏi nào</p>
            <p className="mt-1 text-sm text-gray-400">
              Chưa có câu hỏi thường gặp nào được đăng tải.
            </p>
          </div>
        ) : (
          /* Grouped FAQ */
          <div className="space-y-4">
            {groups.map((group: FaqGroup) => (
              <div key={group.category} className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
                <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    {group.category}
                  </h2>
                </div>
                {group.items.map((item: FaqItem) => (
                  <FaqAccordionItem key={item.id} item={item} />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50 p-6 text-center">
          <p className="font-semibold text-gray-700">Không tìm thấy câu trả lời?</p>
          <p className="mt-1 text-sm text-gray-500">
            Đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng giúp đỡ bạn.
          </p>
          <Link
            href="/support"
            className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Tạo yêu cầu hỗ trợ →
          </Link>
        </div>
      </div>
    </div>
  );
}
