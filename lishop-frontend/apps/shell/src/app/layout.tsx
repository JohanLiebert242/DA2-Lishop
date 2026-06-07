import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/providers';
import { Header } from '../components/header';
import { Footer } from '../components/footer';
import { AnnouncementBar } from '../components/announcement-bar';
import { AiChatWidget } from '../components/ai-chat-widget';

export const metadata: Metadata = {
  title: 'Lishop — Mua sắm thông minh',
  description: 'Nền tảng thương mại điện tử hàng đầu Việt Nam. Hàng nghìn sản phẩm chất lượng.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="flex min-h-screen flex-col bg-warm">
        <Providers>
          <AnnouncementBar />
          <Header />
          <main className="flex-1">{children}</main>
          <AiChatWidget />
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
