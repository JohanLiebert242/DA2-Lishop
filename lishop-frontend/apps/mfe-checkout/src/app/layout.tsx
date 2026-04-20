import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { MiniHeader } from '../components/mini-header';
import { MiniFooter } from '../components/mini-footer';

export const metadata: Metadata = {
  title: 'Thanh toán — Lishop',
  description: 'Hoàn tất đơn hàng của bạn',
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="flex min-h-screen flex-col bg-warm">
        <Providers>
          <MiniHeader title="Thanh toán" />
          <main className="flex-1">{children}</main>
          <MiniFooter />
        </Providers>
      </body>
    </html>
  );
}
