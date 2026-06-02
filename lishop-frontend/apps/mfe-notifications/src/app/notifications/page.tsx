'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hasSessionCookie } from '@lishop/shared';
import {
  notificationsApi,
  NotificationItem,
  NotificationPreference,
  UpsertPreferenceInput,
  EVENT_LABELS,
} from '../../lib/notifications-api';
import { AccountSidebar } from '../../components/account-sidebar';

const AUTH_URL = process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001';

// ─── Feed ───────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  ORDER_STATUS: '📦',
  PROMOTIONS: '🎉',
  NEW_PRODUCTS: '🆕',
  REVIEWS: '⭐',
};

function updateUnreadCount(notifications: NotificationItem[]) {
  const unreadCount = notifications.filter((item) => !item.isRead).length.toString();
  window.localStorage.setItem('lishop_notification_count', unreadCount);
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'lishop_notification_count',
    newValue: unreadCount,
  }));
}

function NotificationRow({ notif }: { notif: NotificationItem }) {
  const queryClient = useQueryClient();

  const markRead = useMutation({
    mutationFn: () => notificationsApi.markAsRead(notif.id),
    onMutate: () => {
      queryClient.setQueryData<NotificationItem[]>(['notification-feed'], (old) =>
        {
          const next = old?.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)) ?? [];
          updateUnreadCount(next);
          return next;
        },
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
      className={`card p-4 flex items-start gap-3 transition-all ${
        notif.isRead ? 'opacity-60' : 'border-indigo-200 bg-indigo-50/30'
      }`}
    >
      <div className="relative shrink-0">
        <span className="text-xl">{TYPE_ICONS[notif.type] ?? '🔔'}</span>
        {!notif.isRead && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-2 ring-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${notif.isRead ? 'text-stone-600' : 'text-stone-900'}`}>
          {notif.title}
        </p>
        <p className="mt-0.5 text-xs text-muted">{notif.body}</p>
        <p className="mt-1.5 text-xs text-faint">
          {new Date(notif.createdAt).toLocaleString('vi-VN')}
        </p>
      </div>
      {!notif.isRead && (
        <button
          type="button"
          aria-label={`Đánh dấu đã đọc: ${notif.title}`}
          onClick={() => markRead.mutate()}
          disabled={markRead.isPending}
          className="shrink-0 cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Đã đọc
        </button>
      )}
    </div>
  );
}

function FeedTab() {
  const queryClient = useQueryClient();
  const [streamState, setStreamState] = useState<'connecting' | 'live' | 'fallback'>('connecting');
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notification-feed'],
    queryFn: () => notificationsApi.listFeed(1),
    refetchInterval: streamState === 'live' ? 60_000 : 15_000,
    retry: 2,
  });

  useEffect(() => {
    const stream = new EventSource(notificationsApi.streamUrl(), { withCredentials: true });

    stream.onopen = () => setStreamState('live');

    stream.addEventListener('notification', (event) => {
      try {
        const notification = JSON.parse((event as MessageEvent).data) as NotificationItem;
        queryClient.setQueryData<NotificationItem[]>(['notification-feed'], (current = []) => {
          if (current.some((item) => item.id === notification.id)) return current;
          const next = [notification, ...current];
          updateUnreadCount(next);
          return next;
        });
      } catch {
        queryClient.invalidateQueries({ queryKey: ['notification-feed'] });
      }
    });

    stream.onerror = () => {
      setStreamState('fallback');
      queryClient.invalidateQueries({ queryKey: ['notification-feed'] });
    };

    return () => stream.close();
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-stone-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-40 rounded bg-stone-100" />
                <div className="h-2.5 w-64 rounded bg-stone-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center gap-3">
        <span className="text-5xl">🔔</span>
        <div>
          <p className="font-bold text-stone-700">Chưa có thông báo nào</p>
          <p className="mt-1 text-sm text-muted">Các thông báo về đơn hàng và khuyến mãi sẽ hiển thị ở đây.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
        streamState === 'live'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-700'
      }`}>
        {streamState === 'live'
          ? 'Realtime đang hoạt động. Thông báo mới sẽ tự xuất hiện.'
          : 'Đang dùng chế độ tự làm mới. Feed vẫn cập nhật định kỳ khi realtime tạm gián đoạn.'}
      </div>
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
      className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-indigo-600' : 'bg-stone-200'
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
    <div className="flex items-center justify-between border-b border-warm py-4 last:border-0">
      <span className="text-sm font-semibold text-stone-800">{label}</span>
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted">Email</span>
          <Toggle
            checked={pref.emailEnabled}
            onChange={(v) => mutation.mutate({ emailEnabled: v })}
            disabled={mutation.isPending}
            label={`${label} - Email`}
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted">Push</span>
          <Toggle
            checked={pref.pushEnabled}
            onChange={(v) => mutation.mutate({ pushEnabled: v })}
            disabled={mutation.isPending}
            label={`${label} - Push`}
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted">Trong app</span>
          <Toggle
            checked={pref.inAppEnabled}
            onChange={(v) => mutation.mutate({ inAppEnabled: v })}
            disabled={mutation.isPending}
            label={`${label} - Trong app`}
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
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-warm px-5 py-3.5">
        <span className="text-xs font-bold uppercase tracking-widest text-muted">
          Loại thông báo
        </span>
        <div className="flex gap-6">
          <span className="w-11 text-center text-xs font-bold uppercase text-muted">Email</span>
          <span className="w-11 text-center text-xs font-bold uppercase text-muted">Push</span>
          <span className="w-11 text-center text-xs font-bold uppercase text-muted">App</span>
        </div>
      </div>
      <div className="px-5">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted">Đang tải...</p>
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
  useEffect(() => {
    if (!hasSessionCookie()) window.location.replace(`${AUTH_URL}/login`);
  }, []);

  const [activeTab, setActiveTab] = useState<Tab>('feed');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex gap-7">
        <AccountSidebar activeSection="notifications" />

        <div className="flex-1 min-w-0">
          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">Thông báo</h1>
            <p className="mt-0.5 text-sm text-muted">Cập nhật về đơn hàng, khuyến mãi và nhiều hơn nữa</p>
          </div>

          {/* Tabs */}
          <div className="mb-5 flex gap-1 rounded-xl bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('feed')}
              className={`flex-1 cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === 'feed'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Thông báo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preferences')}
              className={`flex-1 cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === 'preferences'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Cài đặt
            </button>
          </div>

          {activeTab === 'feed' ? (
            <FeedTab />
          ) : (
            <>
              <PreferencesTab />
              <p className="mt-3 text-center text-xs text-muted">Thay đổi được lưu tự động.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
