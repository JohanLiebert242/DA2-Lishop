'use client';

const MFE_ORDERS = process.env['NEXT_PUBLIC_MFE_ORDERS_URL'] ?? 'http://localhost:3005';
const MFE_PROFILE = process.env['NEXT_PUBLIC_MFE_PROFILE_URL'] ?? 'http://localhost:3006';
const MFE_NOTIF = process.env['NEXT_PUBLIC_MFE_NOTIFICATIONS_URL'] ?? 'http://localhost:3008';

type AccountSection = 'orders' | 'profile' | 'addresses' | 'wallet' | 'notifications' | 'wishlist' | 'support';

const PROFILE_SECTIONS: Array<{ icon: string; label: string; href: string; key: AccountSection }> = [
  { icon: '•', label: 'Thông tin cá nhân', href: `${MFE_PROFILE}/profile`, key: 'profile' },
  { icon: '•', label: 'Địa chỉ', href: `${MFE_PROFILE}/addresses`, key: 'addresses' },
  { icon: '•', label: 'Ví Lishop', href: `${MFE_PROFILE}/wallet`, key: 'wallet' },
  { icon: '•', label: 'Hỗ trợ', href: `${MFE_PROFILE}/support`, key: 'support' },
];

const PROFILE_KEYS = new Set<AccountSection>(PROFILE_SECTIONS.map((item) => item.key));

export function AccountSidebar({ activeSection }: { activeSection: AccountSection }) {
  const isProfileGroupActive = PROFILE_KEYS.has(activeSection);

  return (
    <aside className="w-56 shrink-0">
      <div className="overflow-hidden rounded-2xl border border-warm bg-white shadow-sm">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <span className="text-2xl">👤</span>
          </div>
          <p className="text-sm font-bold">Tài khoản của tôi</p>
          <p className="mt-0.5 text-xs text-white/70">Quản lý thông tin cá nhân</p>
        </div>

        <nav className="p-2">
          <a
            href={`${MFE_ORDERS}/orders`}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
              activeSection === 'orders'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
            }`}
          >
            <span className="text-base">📦</span>
            Đơn hàng của tôi
            {activeSection === 'orders' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600" />}
          </a>

          <div className="mt-1 rounded-xl bg-stone-50/70 p-1.5">
            <a
              href={`${MFE_PROFILE}/profile`}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-bold transition-all ${
                isProfileGroupActive
                  ? 'text-indigo-700'
                  : 'text-stone-700 hover:bg-white hover:text-stone-900'
              }`}
            >
              <span className="text-base">👤</span>
              Trang cá nhân
            </a>

            <div className="mt-1 space-y-0.5 border-l border-stone-200 pl-3">
              {PROFILE_SECTIONS.map((item) => {
                const isActive = activeSection === item.key;

                return (
                  <a
                    key={item.key}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-stone-500 hover:bg-white hover:text-stone-900'
                    }`}
                  >
                    <span className="text-xs">{item.icon}</span>
                    {item.label}
                    {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600" />}
                  </a>
                );
              })}
            </div>
          </div>

          <a
            href={`${MFE_NOTIF}/notifications`}
            className={`mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
              activeSection === 'notifications'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
            }`}
          >
            <span className="text-base">🔔</span>
            Thông báo
            {activeSection === 'notifications' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600" />}
          </a>
        </nav>

        <div className="m-2 rounded-xl bg-stone-50 p-3 text-center">
          <p className="text-xs font-semibold text-stone-700">Cần hỗ trợ?</p>
          <p className="mt-1 text-xs text-muted">Hotline: 1800 1234</p>
          <p className="text-xs text-muted">8:00 - 22:00 hằng ngày</p>
        </div>
      </div>
    </aside>
  );
}
