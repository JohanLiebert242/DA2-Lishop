import Link from 'next/link';
import Image from 'next/image';

const SHELL = 'http://localhost:3010';
const MFE = {
  catalog:  'http://localhost:3002',
  cart:     'http://localhost:3003',
  orders:   'http://localhost:3005',
  profile:  'http://localhost:3006',
  promotions: 'http://localhost:3007',
  notifications: 'http://localhost:3008',
  admin:    'http://localhost:3009',
  auth:     'http://localhost:3001',
};

const LINKS = {
  'Mua sắm': [
    { label: 'Tất cả sản phẩm', href: `${MFE.catalog}/products` },
    { label: 'Khuyến mãi & Flash sale', href: `${MFE.promotions}/promotions` },
    { label: 'Điện tử', href: `${MFE.catalog}/products` },
    { label: 'Thời trang', href: `${MFE.catalog}/products` },
    { label: 'Nhà cửa & Đời sống', href: `${MFE.catalog}/products` },
  ],
  'Tài khoản': [
    { label: 'Đăng nhập', href: `${MFE.auth}/login` },
    { label: 'Đăng ký', href: `${MFE.auth}/register` },
    { label: 'Đơn hàng của tôi', href: `${MFE.orders}/orders` },
    { label: 'Trang cá nhân', href: `${MFE.profile}/profile` },
    { label: 'Thông báo', href: `${MFE.notifications}/notifications` },
  ],
  'Hỗ trợ': [
    { label: 'Hướng dẫn mua hàng', href: `${SHELL}/support` },
    { label: 'Chính sách đổi trả', href: `${SHELL}/support` },
    { label: 'Chính sách vận chuyển', href: `${SHELL}/support` },
    { label: 'Câu hỏi thường gặp', href: `${SHELL}/support` },
    { label: 'Liên hệ hỗ trợ', href: `${SHELL}/support` },
  ],
};

const PAYMENTS = ['💳 Visa/MC', '🏦 VNPay', '📱 MoMo', '🤝 COD'];

export function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300 mt-auto">
      {/* Main footer grid */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href={SHELL} className="flex items-center gap-2.5">
              <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-white">
                <Image src="/lishop-logo.png" alt="Lishop logo" fill className="object-contain p-1.5" sizes="44px" />
              </div>
              <span className="text-xl font-black text-white">Lishop</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-stone-400 max-w-xs">
              Nền tảng thương mại điện tử hàng đầu Việt Nam. Hàng nghìn sản phẩm chất lượng,
              giao hàng nhanh chóng, thanh toán an toàn.
            </p>

            {/* Trust badges */}
            <div className="mt-6 flex flex-wrap gap-2">
              {PAYMENTS.map(p => (
                <span key={p} className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-medium text-stone-300">
                  {p}
                </span>
              ))}
            </div>

            {/* Social links */}
            <div className="mt-6 flex items-center gap-3">
              {[
                { label: 'Facebook', icon: (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                )},
                { label: 'Instagram', icon: (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                )},
                { label: 'YouTube', icon: (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                )},
              ].map(s => (
                <a key={s.label} href="#" aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-800 text-stone-400 hover:bg-indigo-600 hover:text-white transition-all">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="mb-4 text-sm font-black text-white uppercase tracking-widest">{title}</h3>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link.label}>
                    <a href={link.href}
                      className="text-sm text-stone-400 hover:text-white transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-stone-800">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-stone-500">
            © 2026 Lishop. Tất cả quyền được bảo lưu.
          </p>
          <div className="flex items-center gap-4 text-xs text-stone-500">
            <a href="#" className="hover:text-stone-300 transition-colors">Điều khoản sử dụng</a>
            <span className="text-stone-700">·</span>
            <a href="#" className="hover:text-stone-300 transition-colors">Chính sách bảo mật</a>
            <span className="text-stone-700">·</span>
            <a href="#" className="hover:text-stone-300 transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
