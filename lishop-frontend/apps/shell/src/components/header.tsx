'use client';

import Link from 'next/link';
import { useAuth } from '../hooks/use-auth';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-indigo-600">
          Lishop
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/products" className="text-sm text-gray-600 hover:text-gray-900">
            Sản phẩm
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">{user?.firstName}</span>
              <button
                onClick={() => void logout()}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="http://localhost:3001/login"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Đăng nhập
              </Link>
              <Link
                href="http://localhost:3001/register"
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
