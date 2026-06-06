'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';

const CATALOG_URL = process.env['NEXT_PUBLIC_MFE_CATALOG_URL'] ?? 'http://localhost:3002';
const ORDERS_URL = process.env['NEXT_PUBLIC_MFE_ORDERS_URL'] ?? 'http://localhost:3005';
const PROFILE_URL = process.env['NEXT_PUBLIC_MFE_PROFILE_URL'] ?? 'http://localhost:3006';
const PROMOTIONS_URL = process.env['NEXT_PUBLIC_MFE_PROMOTIONS_URL'] ?? 'http://localhost:3007';

const categories = [
  {
    title: 'Mua Sắm Cùng Lishop',
    icon: 'store',
    href: `${CATALOG_URL}/products`,
    tone: 'rose',
  },
  {
    title: 'Khuyến Mãi & Ưu Đãi',
    icon: 'tag',
    href: `${PROMOTIONS_URL}/promotions`,
    tone: 'orange',
  },
  {
    title: 'Thanh Toán',
    icon: 'wallet',
    href: `${PROFILE_URL}/wallet`,
    tone: 'red',
  },
  {
    title: 'Đơn Hàng & Vận Chuyển',
    icon: 'truck',
    href: `${ORDERS_URL}/orders`,
    tone: 'teal',
  },
  {
    title: 'Trả Hàng & Hoàn Tiền',
    icon: 'return',
    href: `${PROFILE_URL}/support`,
    tone: 'amber',
  },
  {
    title: 'Thông Tin Chung',
    icon: 'info',
    href: `${PROFILE_URL}/support/faq`,
    tone: 'blue',
  },
] as const;

const faqs = [
  '[Cảnh báo lừa đảo] Mua sắm an toàn cùng Lishop',
  '[Thành viên mới] Tại sao tôi không thể đăng ký tài khoản bằng số điện thoại của mình?',
  '[Trả hàng/ Hoàn tiền] Cách đóng gói đơn hàng hoàn trả',
  '[LishopPay] Hướng dẫn liên kết ví với tài khoản Lishop',
  '[Hoàn tiền] Tôi cần làm gì nếu không nhận được tiền hoàn cho đơn hàng đã thanh toán?',
  '[Tài khoản Lishop] Tôi không thể đặt hàng/đăng ký/đăng nhập do số điện thoại đã tồn tại',
  '[Dịch vụ] Cách liên hệ Chăm sóc khách hàng Lishop',
  '[Vận chuyển] Làm sao để kiểm tra trạng thái giao hàng?',
];

function CategoryIcon({ icon, tone }: { icon: (typeof categories)[number]['icon']; tone: string }) {
  const toneClass: Record<string, string> = {
    rose: 'bg-rose-50 text-rose-500',
    orange: 'bg-orange-50 text-orange-500',
    red: 'bg-red-50 text-red-500',
    teal: 'bg-teal-50 text-teal-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  return (
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${toneClass[tone] ?? toneClass.rose}`}>
      {icon === 'store' && (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 10h16l-1-5H5l-1 5Zm1 0v9h14v-9M9 19v-5h6v5M8 10v2a2 2 0 1 1-4 0v-2m8 0v2a2 2 0 1 1-4 0v-2m8 0v2a2 2 0 1 1-4 0v-2m8 0v2a2 2 0 1 1-4 0v-2" />
        </svg>
      )}
      {icon === 'tag' && (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h.01M4 4h7l9 9-7 7-9-9V4Z" />
        </svg>
      )}
      {icon === 'wallet' && (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 7h14a2 2 0 0 1 2 2v10H5a3 3 0 0 1-3-3V6a3 3 0 0 0 3 3h16m-5 5h.01" />
        </svg>
      )}
      {icon === 'truck' && (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 6h11v11H3V6Zm14 4h3l2 3v4h-5v-7ZM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        </svg>
      )}
      {icon === 'return' && (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 7 5 11l4 4M5 11h10a5 5 0 0 1 0 10h-1M15 3v4m-3-1h6" />
        </svg>
      )}
      {icon === 'info' && (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 17v-6m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      )}
    </span>
  );
}

export default function SupportPage() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filteredFaqs = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return faqs;
    return faqs.filter((faq) => faq.toLowerCase().includes(keyword));
  }, [query]);

  // Note: navigation uses a plain GET form submit (see below) so E2E can
  // navigate even before client hydration finishes.

  return (
    <div className="bg-white text-stone-900">
      <section className="border-b border-stone-100 bg-white">
        <div className="mx-auto flex max-w-[980px] items-center justify-between px-4 py-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative h-9 w-9 overflow-hidden rounded-sm border border-red-100 bg-white">
              <Image src="/lishop-logo.png" alt="Lishop" fill className="object-contain p-1" sizes="36px" />
            </span>
            <span className="text-2xl font-black text-red-500">Lishop</span>
            <span className="h-6 w-px bg-stone-200" />
            <span className="text-base font-medium text-red-500">Trung tâm trợ giúp Lishop VN</span>
          </Link>
          <Link href="/support/policies" className="hidden text-sm font-bold text-stone-700 hover:text-red-500 sm:inline" aria-label="Lishop Policies">
            Lishop Policies
          </Link>
        </div>
      </section>

      <section data-testid="support-hero" className="bg-[#ee4d2d] px-4 py-12 text-white sm:py-14">
        <div className="mx-auto max-w-[980px] text-center">
          <h1 className="text-3xl font-medium tracking-normal sm:text-4xl">Xin chào, Lishop có thể giúp gì cho bạn?</h1>
          <form method="GET" action="/support" className="mx-auto mt-8 flex h-16 max-w-[680px] overflow-hidden rounded-sm bg-white shadow-sm">
            <input
              data-testid="support-search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              ref={inputRef}
              name="q"
              type="search"
              placeholder="Nhập từ khóa hoặc nội dung cần tìm"
              className="min-w-0 flex-1 px-5 text-lg font-medium text-stone-800 outline-none placeholder:text-stone-400"
            />
            <button
              data-testid="support-search-submit"
              type="submit"
              aria-label="Tìm kiếm hỗ trợ"
              className="flex w-20 items-center justify-center border-l border-red-100 bg-[#ee4d2d] text-white transition hover:bg-red-600"
            >
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
              </svg>
            </button>
          </form>
        </div>
      </section>

      <main className="mx-auto max-w-[980px] px-4 py-5">
        <section data-testid="support-alert" className="relative border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-stone-700">
          <p className="pr-10">
            Cập nhật: Lishop đồng bộ thông tin địa chỉ giao hàng theo khu vực mới. Xem chi tiết tại{' '}
            <Link href="/support/policies" className="font-semibold text-blue-500 hover:underline">
              Liên kết
            </Link>
          </p>
          <button type="button" aria-label="Đóng thông báo" className="absolute right-4 top-4 text-stone-400 hover:text-stone-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
          <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-1.5">
            {[0, 1, 2, 3, 4].map((dot) => (
              <span key={dot} className={`h-1.5 w-1.5 rounded-full ${dot === 0 ? 'bg-stone-500' : 'bg-stone-300'}`} />
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-black text-stone-900">Danh mục</h2>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.title}
                href={category.href}
                data-testid="support-category-card"
                className="flex min-h-20 items-center gap-4 border border-stone-200 bg-white px-5 py-4 transition hover:border-red-200 hover:shadow-[0_8px_24px_rgba(238,77,45,0.12)]"
              >
                <CategoryIcon icon={category.icon} tone={category.tone} />
                <span className="text-base font-semibold leading-5 text-stone-800">{category.title}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 pb-16">
          <h2 className="text-2xl font-black text-stone-900">Câu hỏi thường gặp</h2>
          <div data-testid="support-faq-list" className="mt-4 divide-y divide-stone-100 border-t border-stone-100">
            {(filteredFaqs.length > 0 ? filteredFaqs : faqs).map((faq) => (
              <Link key={faq} href={`${PROFILE_URL}/support/faq`} className="block py-4 text-base font-medium text-stone-800 transition hover:text-red-500">
                {faq}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
