'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingBag, Store, MessageCircle } from 'lucide-react';
import { Providers } from './providers';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard },
  { href: '/products', label: 'Sản phẩm', icon: Package },
  { href: '/orders', label: 'Đơn hàng', icon: ShoppingBag },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/shop', label: 'Cửa hàng của tôi', icon: Store },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="vi">
      <body className="min-h-screen bg-gray-50">
        <Providers>
          <div className="flex">
            <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r bg-white">
              <div className="flex items-center gap-2 border-b px-4 py-4">
                <Store className="h-6 w-6 text-violet-600" />
                <span className="text-base font-bold text-gray-900">Kênh người bán</span>
              </div>
              <nav className="flex-1 space-y-1 px-3 py-4">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-violet-100 text-violet-800'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
            <main className="ml-60 flex-1 p-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
