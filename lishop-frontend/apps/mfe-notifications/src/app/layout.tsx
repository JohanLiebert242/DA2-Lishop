import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { MiniHeader } from '../components/mini-header';
import { MiniFooter } from '../components/mini-footer';

export const metadata: Metadata = {
  title: 'Thông báo — Lishop',
  description: 'Quản lý thông báo của bạn',
};

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="flex min-h-screen flex-col bg-warm">
        <Providers>
          <MiniHeader title="Thông báo" />
          <main className="flex-1">{children}</main>
          <MiniFooter />
        </Providers>
      </body>
    </html>
  );
}
