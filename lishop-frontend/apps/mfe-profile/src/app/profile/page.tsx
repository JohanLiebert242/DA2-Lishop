'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, UpdateProfileInput, LoyaltyPointItem } from '../../lib/profile-api';
import { AccountSidebar } from '../../components/account-sidebar';

const AUTH_URL = process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001';

export default function ProfilePage() {
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)lishop_at=([^;]*)/);
    if (!match) window.location.replace(`${AUTH_URL}/login`);
  }, []);

  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateProfileInput>({});
  const [message, setMessage] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.getProfile(),
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProfileInput) => profileApi.updateProfile(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['profile'], updated);
      setEditing(false);
      setMessage('Cập nhật thành công!');
      setTimeout(() => setMessage(''), 3000);
    },
  });

  const { data: loyaltyHistory = [] } = useQuery({
    queryKey: ['loyalty-history'],
    queryFn: () => profileApi.getLoyaltyHistory(),
    enabled: !!profile,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex gap-7">
          <AccountSidebar activeSection="profile" />
          <div className="flex-1 min-w-0">
            <div className="card p-8 animate-pulse">
              <div className="h-6 w-40 rounded bg-stone-100 mb-6" />
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-stone-100 shrink-0" />
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-stone-100" />
                  <div className="h-3 w-48 rounded bg-stone-100" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-3 w-full rounded bg-stone-100" />
                <div className="h-3 w-3/4 rounded bg-stone-100" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex gap-7">
          <AccountSidebar activeSection="profile" />
          <div className="flex-1 min-w-0">
            <div className="card flex flex-col items-center justify-center py-20 text-center gap-4">
              <span className="text-5xl">🔒</span>
              <div>
                <p className="font-bold text-stone-700">Vui lòng đăng nhập</p>
                <p className="mt-1 text-sm text-muted">Bạn cần đăng nhập để xem trang cá nhân.</p>
              </div>
              <a
                href="http://localhost:3001/login"
                className="btn-primary mt-2"
              >
                Đăng nhập
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const initials = (profile?.firstName?.[0] ?? profile?.email?.[0] ?? 'U').toUpperCase();
  const displayName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : profile?.email ?? '';

  function handleEdit() {
    setForm({
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      avatarUrl: profile?.avatarUrl ?? '',
    });
    setEditing(true);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex gap-7">
        <AccountSidebar activeSection="profile" />

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black text-stone-900 tracking-tight mb-6">Trang cá nhân</h1>

          {/* Profile card */}
          <div className="card p-6">
            {/* Avatar + name */}
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-600 text-xl font-bold text-white shadow-brand">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt={displayName} className="h-16 w-16 object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div>
                <p className="text-lg font-black text-stone-900">{displayName}</p>
                <p className="text-sm text-muted">{profile.email}</p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                  ⭐ {profile.loyaltyPoints} điểm tích lũy
                </span>
              </div>
            </div>

            {message && (
              <p className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                ✓ {message}
              </p>
            )}

            {editing ? (
              <div className="space-y-4">
                {/* Avatar preview + URL input */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">Ảnh đại diện (URL)</label>
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-600 text-lg font-bold text-white shadow-brand">
                      {form.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.avatarUrl} alt="preview" className="h-14 w-14 object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        initials
                      )}
                    </div>
                    <input
                      value={form.avatarUrl ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
                      className="input-field"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">Họ</label>
                  <input
                    value={form.firstName ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="input-field"
                    placeholder="Nhập họ của bạn"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">Tên</label>
                  <input
                    value={form.lastName ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="input-field"
                    placeholder="Nhập tên của bạn"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => updateMutation.mutate(form)}
                    disabled={updateMutation.isPending}
                    className="btn-primary disabled:opacity-50"
                  >
                    {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="rounded-xl border border-warm px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-warm px-4 py-3">
                  <span className="text-sm text-muted">Họ và tên</span>
                  <span className="text-sm font-semibold text-stone-900">{displayName}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-warm px-4 py-3">
                  <span className="text-sm text-muted">Email</span>
                  <span className="text-sm font-semibold text-stone-900">{profile.email}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-warm px-4 py-3">
                  <span className="text-sm text-muted">Vai trò</span>
                  <span className="text-sm font-semibold text-stone-900">
                    {profile.role === 'ADMIN' ? 'Quản trị viên' : 'Khách hàng'}
                  </span>
                </div>
                <button
                  onClick={handleEdit}
                  className="btn-primary mt-2 w-full"
                >
                  Chỉnh sửa thông tin
                </button>
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <a
              href="http://localhost:3005/orders"
              className="card p-4 text-center hover:border-indigo-200 transition-all"
            >
              <p className="text-2xl">📦</p>
              <p className="mt-1 text-sm font-bold text-stone-700">Đơn hàng</p>
            </a>
            <a
              href="http://localhost:3003/cart"
              className="card p-4 text-center hover:border-indigo-200 transition-all"
            >
              <p className="text-2xl">🛒</p>
              <p className="mt-1 text-sm font-bold text-stone-700">Giỏ hàng</p>
            </a>
          </div>

          {/* Loyalty point history */}
          {loyaltyHistory.length > 0 && (
            <div className="mt-4 card overflow-hidden">
              <div className="border-b border-warm px-5 py-3.5">
                <h2 className="text-sm font-black text-stone-900">Lịch sử điểm tích lũy</h2>
              </div>
              <ul className="divide-y divide-warm">
                {loyaltyHistory.map((item: LoyaltyPointItem) => (
                  <li key={item.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{item.description}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-black ${
                        item.points >= 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {item.points >= 0 ? '+' : ''}{item.points}đ
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
