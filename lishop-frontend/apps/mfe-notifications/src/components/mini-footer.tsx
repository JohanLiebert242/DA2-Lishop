const SHELL = process.env['NEXT_PUBLIC_SHELL_URL'] ?? 'http://localhost:3010';
const MFE_AUTH = process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001';
const MFE_CATALOG = process.env['NEXT_PUBLIC_MFE_CATALOG_URL'] ?? 'http://localhost:3002';
const MFE_ORDERS = process.env['NEXT_PUBLIC_MFE_ORDERS_URL'] ?? 'http://localhost:3005';
const MFE_PROFILE = process.env['NEXT_PUBLIC_MFE_PROFILE_URL'] ?? 'http://localhost:3006';

export function MiniFooter() {
  return (
    <footer className="mt-auto border-t border-warm bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
          {/* Brand */}
          <a href={SHELL} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600">
              <span className="text-sm font-black text-white">Li</span>
            </div>
            <span className="text-base font-black text-stone-900">Lishop</span>
          </a>

          {/* Quick links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {[
              { label: 'Trang chủ', href: SHELL },
              { label: 'Sản phẩm', href: `${MFE_CATALOG}/products` },
              { label: 'Đơn hàng', href: `${MFE_ORDERS}/orders` },
              { label: 'Tài khoản', href: `${MFE_PROFILE}/profile` },
              { label: 'Đăng nhập', href: `${MFE_AUTH}/login` },
            ].map(l => (
              <a key={l.label} href={l.href}
                className="text-sm text-muted hover:text-indigo-600 transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          {/* Payment icons row */}
          <div className="flex items-center gap-2 text-xs text-stone-400">
            {['💳 Visa', '🏦 VNPay', '📱 MoMo', '🤝 COD'].map(p => (
              <span key={p} className="rounded-md bg-stone-100 px-2 py-1">{p}</span>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-warm pt-5 text-center text-xs text-muted">
          © 2026 Lishop. Tất cả quyền được bảo lưu.
        </div>
      </div>
    </footer>
  );
}
