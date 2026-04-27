'use client';

const MFE_ORDERS  = process.env['NEXT_PUBLIC_MFE_ORDERS_URL']        ?? 'http://localhost:3005';
const MFE_PROFILE = process.env['NEXT_PUBLIC_MFE_PROFILE_URL']       ?? 'http://localhost:3006';
const MFE_NOTIF   = process.env['NEXT_PUBLIC_MFE_NOTIFICATIONS_URL'] ?? 'http://localhost:3008';

const NAV = [
  { icon: '📦', label: 'Đơn hàng của tôi', href: `${MFE_ORDERS}/orders`,        key: 'orders' },
  { icon: '👤', label: 'Trang cá nhân',    href: `${MFE_PROFILE}/profile`,       key: 'profile' },
  { icon: '📍', label: 'Địa chỉ',          href: `${MFE_PROFILE}/addresses`,     key: 'addresses' },
  { icon: '💰', label: 'Ví Lishop',        href: `${MFE_PROFILE}/wallet`,        key: 'wallet' },
  { icon: '♡',  label: 'Yêu thích',        href: `${MFE_PROFILE}/wishlist`,      key: 'wishlist' },
  { icon: '🔔', label: 'Thông báo',         href: `${MFE_NOTIF}/notifications`,  key: 'notifications' },
  { icon: '🎧', label: 'Hỗ trợ',           href: `${MFE_PROFILE}/support`,       key: 'support' },
];

export function AccountSidebar({ activeSection }: { activeSection: 'orders' | 'profile' | 'addresses' | 'wallet' | 'notifications' | 'wishlist' | 'support' }) {
  return (
    <aside className="w-56 shrink-0">
      <div className="rounded-2xl bg-white border border-warm shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-3">
            <span className="text-2xl">👤</span>
          </div>
          <p className="text-sm font-bold">Tài khoản của tôi</p>
          <p className="mt-0.5 text-xs text-white/70">Quản lý thông tin cá nhân</p>
        </div>

        {/* Nav */}
        <nav className="p-2">
          {NAV.map(item => {
            const isActive = item.key === activeSection;
            return (
              <a
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600" />}
              </a>
            );
          })}
        </nav>

        {/* Support box */}
        <div className="m-2 rounded-xl bg-stone-50 p-3 text-center">
          <p className="text-xs font-semibold text-stone-700">Cần hỗ trợ?</p>
          <p className="mt-1 text-xs text-muted">Hotline: 1800 1234</p>
          <p className="text-xs text-muted">8:00 - 22:00 hàng ngày</p>
        </div>
      </div>
    </aside>
  );
}
