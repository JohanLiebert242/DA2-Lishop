'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  notificationsApi,
  NotificationPreference,
  UpsertPreferenceInput,
  EVENT_LABELS,
} from '../../lib/notifications-api';

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
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
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-500">Push</span>
          <Toggle
            checked={pref.pushEnabled}
            onChange={(v) => mutation.mutate({ pushEnabled: v })}
            disabled={mutation.isPending}
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-500">Trong app</span>
          <Toggle
            checked={pref.inAppEnabled}
            onChange={(v) => mutation.mutate({ inAppEnabled: v })}
            disabled={mutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { data: preferences = [], isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationsApi.getPreferences(),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Cài đặt thông báo</h1>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Column headers */}
        <div className="flex items-center justify-between border-b px-6 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Loại thông báo
          </span>
          <div className="flex gap-6">
            <span className="w-11 text-center text-xs font-semibold uppercase text-gray-500">
              Email
            </span>
            <span className="w-11 text-center text-xs font-semibold uppercase text-gray-500">
              Push
            </span>
            <span className="w-11 text-center text-xs font-semibold uppercase text-gray-500">
              App
            </span>
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

      <p className="mt-4 text-center text-xs text-gray-400">Thay đổi được lưu tự động.</p>
    </div>
  );
}
