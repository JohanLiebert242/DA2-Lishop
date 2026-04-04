import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Sản phẩm — Lishop',
  description: 'Khám phá hàng nghìn sản phẩm chất lượng tại Lishop',
};

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
