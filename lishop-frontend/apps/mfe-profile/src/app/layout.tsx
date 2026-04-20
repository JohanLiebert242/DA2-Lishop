import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { MiniHeader } from '../components/mini-header';
import { MiniFooter } from '../components/mini-footer';

export const metadata: Metadata = {
  title: 'Trang cá nhân — Lishop',
  description: 'Quản lý thông tin cá nhân của bạn',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="flex min-h-screen flex-col bg-warm">
        <Providers>
          <MiniHeader title="Tài khoản" />
          <main className="flex-1">{children}</main>
          <MiniFooter />
        </Providers>
      </body>
    </html>
  );
}
