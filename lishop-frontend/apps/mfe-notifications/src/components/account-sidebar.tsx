'use client';

import { useQuery } from '@tanstack/react-query';
import { hasSessionCookie } from '@lishop/shared';

const MFE_ORDERS = process.env['NEXT_PUBLIC_MFE_ORDERS_URL'] ?? 'http://localhost:3005';
const MFE_PROFILE = process.env['NEXT_PUBLIC_MFE_PROFILE_URL'] ?? 'http://localhost:3006';
const MFE_NOTIF = process.env['NEXT_PUBLIC_MFE_NOTIFICATIONS_URL'] ?? 'http://localhost:3008';

type AccountSection = 'orders' | 'profile' | 'notifications';

const NAV: Array<{ icon: string; label: string; href: string; key: AccountSection }> = [
  { icon: '📦', label: 'Đơn hàng của tôi', href: `${MFE_ORDERS}/orders`, key: 'orders' },
  { icon: '👤', label: 'Trang cá nhân', href: `${MFE_PROFILE}/profile`, key: 'profile' },
  { icon: '🔔', label: 'Thông báo', href: `${MFE_NOTIF}/notifications`, key: 'notifications' },
];

export function AccountSidebar({ activeSection }: { activeSection: AccountSection }) {
  const { data: profile } = useQuery({
    queryKey: ['profile-sidebar'],
    queryFn: async () => {
      const res = await fetch(`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'}/auth/me`, { credentials: 'include' });
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data ?? json) as { firstName?: string; lastName?: string; email?: string; avatarUrl?: string | null };
    },
    enabled: hasSessionCookie(),
    staleTime: 60_000,
    retry: false,
  });

  const initials = (profile?.firstName?.[0] ?? profile?.email?.[0] ?? 'U').toUpperCase();
  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || profile?.email || 'Tài khoản của tôi';

  return (
    <aside className="w-56 shrink-0">
      <div className="overflow-hidden rounded-2xl border border-warm bg-white shadow-sm">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white">
          <div className="mb-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/20 text-base font-black backdrop-blur-sm">
            {profile?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span>{profile ? initials : '👤'}</span>
            )}
          </div>
          <p className="truncate text-sm font-bold">{displayName}</p>
          <p className="mt-0.5 text-xs text-white/70">Quản lý thông tin cá nhân</p>
        </div>

        <nav className="p-2">
          {NAV.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                activeSection === item.key
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
              {activeSection === item.key && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600" />}
            </a>
          ))}
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
