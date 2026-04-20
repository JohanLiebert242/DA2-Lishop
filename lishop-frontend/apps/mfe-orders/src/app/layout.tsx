import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { MiniHeader } from '../components/mini-header';
import { MiniFooter } from '../components/mini-footer';

export const metadata: Metadata = {
  title: 'Đơn hàng — Lishop',
  description: 'Quản lý đơn hàng của bạn',
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="flex min-h-screen flex-col bg-warm">
        <Providers>
          <MiniHeader title="Đơn hàng" />
          <main className="flex-1">{children}</main>
          <MiniFooter />
        </Providers>
      </body>
    </html>
  );
}
