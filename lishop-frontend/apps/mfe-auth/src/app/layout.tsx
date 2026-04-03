import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Xác thực — Lishop',
  description: 'Đăng nhập hoặc tạo tài khoản Lishop',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
