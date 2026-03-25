import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lishop',
  description: 'Lishop E-Commerce Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
