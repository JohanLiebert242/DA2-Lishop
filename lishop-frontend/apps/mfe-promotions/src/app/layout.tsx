import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { MiniHeader } from '../components/mini-header';
import { MiniFooter } from '../components/mini-footer';

export const metadata: Metadata = {
  title: 'Khuyến mãi — Lishop',
  description: 'Flash sale và mã giảm giá hấp dẫn tại Lishop',
};

export default function PromotionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="flex min-h-screen flex-col bg-warm">
        <Providers>
          <MiniHeader title="Khuyến mãi" />
          <main className="flex-1">{children}</main>
          <MiniFooter />
        </Providers>
      </body>
    </html>
  );
}
