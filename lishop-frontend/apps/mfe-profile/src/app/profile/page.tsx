'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, UpdateProfileInput } from '../../lib/profile-api';

export default function ProfilePage() {
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

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-gray-400">Đang tải...</div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-gray-500">Vui lòng đăng nhập để xem trang cá nhân.</p>
        <a
          href="http://localhost:3001/login"
          className="mt-4 inline-block text-indigo-600 hover:underline text-sm"
        >
          Đăng nhập
        </a>
      </div>
    );
  }

  const initials = (profile?.firstName?.[0] ?? profile?.email?.[0] ?? 'U').toUpperCase();
  const displayName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : profile?.email ?? '';

  function handleEdit() {
    setForm({ firstName: profile?.firstName ?? '', lastName: profile?.lastName ?? '' });
    setEditing(true);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Trang cá nhân</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Avatar + name */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-600 text-xl font-bold text-white">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt={displayName} className="h-16 w-16 object-cover" />
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{displayName}</p>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <p className="text-xs text-indigo-600 mt-0.5">{profile.loyaltyPoints} điểm tích lũy</p>
          </div>
        </div>

        {message && (
          <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
        )}

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Họ</label>
              <input
                value={form.firstName ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tên</label>
              <input
                value={form.lastName ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => updateMutation.mutate(form)}
                disabled={updateMutation.isPending}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Họ và tên</span>
              <span className="text-gray-900">{displayName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-900">{profile.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Vai trò</span>
              <span className="text-gray-900">
                {profile.role === 'ADMIN' ? 'Quản trị viên' : 'Khách hàng'}
              </span>
            </div>
            <button
              onClick={handleEdit}
              className="mt-4 w-full rounded-md bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Chỉnh sửa
            </button>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <a
          href="http://localhost:3005/orders"
          className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="text-2xl">📦</p>
          <p className="mt-1 text-sm font-medium text-gray-700">Đơn hàng</p>
        </a>
        <a
          href="http://localhost:3003/cart"
          className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="text-2xl">🛒</p>
          <p className="mt-1 text-sm font-medium text-gray-700">Giỏ hàng</p>
        </a>
      </div>
    </div>
  );
}
