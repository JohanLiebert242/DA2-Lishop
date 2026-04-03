import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/providers';
import { Header } from '../components/header';

export const metadata: Metadata = {
  title: 'Lishop',
  description: 'Lishop E-Commerce Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-gray-50">
        <Providers>
          <Header />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
