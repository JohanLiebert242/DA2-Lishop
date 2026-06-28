import type { Metadata } from 'next';
import { Toaster } from '@lishop/ui';
import { NotificationListener } from './notification-listener';
import './globals.css';

export const metadata: Metadata = {
  title: 'Xác thực — Lishop',
  description: 'Đăng nhập hoặc tạo tài khoản Lishop',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        {children}
        <NotificationListener />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
