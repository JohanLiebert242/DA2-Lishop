'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  notificationsApi,
  NotificationItem,
  NotificationPreference,
  UpsertPreferenceInput,
  EVENT_LABELS,
} from '../../lib/notifications-api';

// ─── Feed ───────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  ORDER_STATUS: '📦',
  PROMOTIONS: '🎉',
  NEW_PRODUCTS: '🆕',
  REVIEWS: '⭐',
};

function NotificationRow({ notif }: { notif: NotificationItem }) {
  const queryClient = useQueryClient();

  const markRead = useMutation({
    mutationFn: () => notificationsApi.markAsRead(notif.id),
    onMutate: () => {
      queryClient.setQueryData<NotificationItem[]>(['notification-feed'], (old) =>
        old?.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)) ?? [],
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-feed'] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-feed'] });
    },
  });

  return (
    <div
      className={`flex items-start gap-3 border-b px-4 py-3 last:border-0 transition-colors ${
        notif.isRead ? 'opacity-60' : 'bg-indigo-50/40'
      }`}
    >
      <span className="mt-0.5 text-xl">{TYPE_ICONS[notif.type] ?? '🔔'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{notif.title}</p>
        <p className="mt-0.5 text-xs text-gray-600">{notif.body}</p>
        <p className="mt-1 text-xs text-gray-400">
          {new Date(notif.createdAt).toLocaleString('vi-VN')}
        </p>
      </div>
      {!notif.isRead && (
        <button
          type="button"
          aria-label={`Đánh dấu đã đọc: ${notif.title}`}
          onClick={() => markRead.mutate()}
          disabled={markRead.isPending}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
        >
          Đánh dấu đã đọc
        </button>
      )}
    </div>
  );
}

function FeedTab() {
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notification-feed'],
    queryFn: () => notificationsApi.listFeed(1),
  });

  if (isLoading) {
    return <p className="py-12 text-center text-sm text-gray-400">Đang tải...</p>;
  }

  if (notifications.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-4xl">🔔</p>
        <p className="mt-3 text-sm text-gray-500">Chưa có thông báo nào.</p>
      </div>
    );
  }

  return (
    <div>
      {notifications.map((notif) => (
        <NotificationRow key={notif.id} notif={notif} />
      ))}
    </div>
  );
}

// ─── Preferences ─────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
        checked ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function PreferenceRow({ pref }: { pref: NotificationPreference }) {
  const queryClient = useQueryClient();
  const label = EVENT_LABELS[pref.eventType] ?? pref.eventType;

  const mutation = useMutation({
    mutationFn: (data: UpsertPreferenceInput) =>
      notificationsApi.upsertPreference(pref.eventType, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] }),
  });

  return (
    <div className="flex items-center justify-between border-b py-4 last:border-0">
      <span className="text-sm font-medium text-gray-800">{label}</span>
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-500">Email</span>
          <Toggle
            checked={pref.emailEnabled}
            onChange={(v) => mutation.mutate({ emailEnabled: v })}
            disabled={mutation.isPending}
            label="Email"
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-500">Push</span>
          <Toggle
            checked={pref.pushEnabled}
            onChange={(v) => mutation.mutate({ pushEnabled: v })}
            disabled={mutation.isPending}
            label="Push"
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-500">Trong app</span>
          <Toggle
            checked={pref.inAppEnabled}
            onChange={(v) => mutation.mutate({ inAppEnabled: v })}
            disabled={mutation.isPending}
            label="Trong app"
          />
        </div>
      </div>
    </div>
  );
}

function PreferencesTab() {
  const { data: preferences = [], isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationsApi.getPreferences(),
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Loại thông báo
        </span>
        <div className="flex gap-6">
          <span className="w-11 text-center text-xs font-semibold uppercase text-gray-500">Email</span>
          <span className="w-11 text-center text-xs font-semibold uppercase text-gray-500">Push</span>
          <span className="w-11 text-center text-xs font-semibold uppercase text-gray-500">App</span>
        </div>
      </div>
      <div className="px-6">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-gray-400">Đang tải...</p>
        ) : (
          preferences.map((pref) => (
            <PreferenceRow key={pref.eventType} pref={pref} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

type Tab = 'feed' | 'preferences';

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('feed');

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Thông báo</h1>

      {/* Tabs */}
      <div className="mb-4 flex border-b">
        <button
          type="button"
          onClick={() => setActiveTab('feed')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'feed'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Thông báo
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'preferences'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Cài đặt
        </button>
      </div>

      {activeTab === 'feed' ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <FeedTab />
        </div>
      ) : (
        <>
          <PreferencesTab />
          <p className="mt-4 text-center text-xs text-gray-400">Thay đổi được lưu tự động.</p>
        </>
      )}
    </div>
  );
}
