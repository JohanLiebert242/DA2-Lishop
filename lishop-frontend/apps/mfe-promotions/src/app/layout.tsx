import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Khuyến mãi — Lishop',
  description: 'Flash sale và mã giảm giá hấp dẫn tại Lishop',
};

export default function PromotionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
