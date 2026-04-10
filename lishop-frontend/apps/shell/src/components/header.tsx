'use client';

import Link from 'next/link';
import { useAuth } from '../hooks/use-auth';

const MFE = {
  auth: 'http://localhost:3001',
  catalog: 'http://localhost:3002',
  cart: 'http://localhost:3003',
  orders: 'http://localhost:3005',
  profile: 'http://localhost:3006',
  promotions: 'http://localhost:3007',
  notifications: 'http://localhost:3008',
  admin: 'http://localhost:3009',
} as const;

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="shrink-0 text-xl font-bold text-indigo-600">
          Lishop
        </Link>

        {/* Primary nav */}
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href={`${MFE.catalog}/products`}
            className="rounded-md px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            Sản phẩm
          </Link>
          <Link
            href={`${MFE.promotions}/promotions`}
            className="rounded-md px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            Khuyến mãi
          </Link>

          {isAuthenticated && (
            <>
              <Link
                href={`${MFE.cart}/cart`}
                className="rounded-md px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                Giỏ hàng
              </Link>
              <Link
                href={`${MFE.orders}/orders`}
                className="rounded-md px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                Đơn hàng
              </Link>
              <Link
                href={`${MFE.notifications}/notifications`}
                className="rounded-md px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                Thông báo
              </Link>
              {user?.role === 'ADMIN' && (
                <Link
                  href={`${MFE.admin}/admin`}
                  className="rounded-md px-3 py-1.5 font-medium text-purple-600 transition-colors hover:bg-purple-50 hover:text-purple-700"
                >
                  Quản trị
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Auth section */}
        <div className="flex shrink-0 items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link
                href={`${MFE.profile}/profile`}
                className="text-sm font-medium text-gray-700 transition-colors hover:text-indigo-600"
              >
                {user?.firstName}
              </Link>
              <button
                onClick={() => void logout()}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link
                href={`${MFE.auth}/login`}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                Đăng nhập
              </Link>
              <Link
                href={`${MFE.auth}/register`}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
