'use client';
import Link from 'next/link';

const SHELL = process.env['NEXT_PUBLIC_SHELL_URL'] ?? 'http://localhost:3010';

export function MiniHeader({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-warm bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href={SHELL} className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 shadow-brand">
            <span className="text-sm font-black text-white leading-none">Li</span>
          </div>
          <span className="text-base font-black text-stone-900 hidden sm:block">Lishop</span>
        </Link>
        {title && (
          <div className="flex items-center gap-2 text-sm">
            <Link href={SHELL} className="text-muted hover:text-indigo-600 transition-colors">Trang chủ</Link>
            <span className="text-stone-300">/</span>
            <span className="font-semibold text-stone-800">{title}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Link href={`${process.env['NEXT_PUBLIC_SHELL_URL'] ?? 'http://localhost:3010'}`}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
            ← Về trang chủ
          </Link>
        </div>
      </div>
    </header>
  );
}
