'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AccountSidebar } from '../../components/account-sidebar';
import { addressesApi, Address, CreateAddressInput } from '../../lib/addresses-api';

const EMPTY_FORM: CreateAddressInput = {
  fullName: '', phone: '', street: '', district: '', city: '', country: 'Việt Nam',
};

function AddressForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
  error,
}: {
  initial: CreateAddressInput;
  onSubmit: (data: CreateAddressInput) => void;
  onCancel: () => void;
  isPending: boolean;
  error: string;
}) {
  const [form, setForm] = useState<CreateAddressInput>(initial);
  const set = (k: keyof CreateAddressInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="rounded-xl border border-warm bg-warm-100 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Họ và tên *</label>
          <input
            value={form.fullName}
            onChange={set('fullName')}
            placeholder="Nguyễn Văn A"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Số điện thoại *</label>
          <input
            value={form.phone}
            onChange={set('phone')}
            placeholder="0912 345 678"
            className="input-field"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-stone-700 mb-1">Địa chỉ (số nhà, tên đường) *</label>
          <input
            value={form.street}
            onChange={set('street')}
            placeholder="123 Nguyễn Huệ"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Quận / Huyện *</label>
          <input
            value={form.district}
            onChange={set('district')}
            placeholder="Quận 1"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">Tỉnh / Thành phố *</label>
          <input
            value={form.city}
            onChange={set('city')}
            placeholder="Hồ Chí Minh"
            className="input-field"
          />
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            if (!form.fullName || !form.phone || !form.street || !form.district || !form.city) return;
            onSubmit(form);
          }}
          disabled={isPending || !form.fullName || !form.phone || !form.street || !form.district || !form.city}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          {isPending ? 'Đang lưu...' : 'Lưu địa chỉ'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-xl border border-warm px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-warm-100 transition-colors"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}

export default function AddressesPage() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressesApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateAddressInput) => addressesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setShowAddForm(false);
      setFormError('');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateAddressInput }) =>
      addressesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setEditingId(null);
      setFormError('');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => addressesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setDeletingId(null);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => addressesApi.setDefault(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });

  function getEditInitial(addr: Address): CreateAddressInput {
    return {
      fullName: addr.fullName,
      phone: addr.phone,
      street: addr.street,
      district: addr.district,
      city: addr.city,
      country: addr.country,
    };
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-8">
      <AccountSidebar activeSection="addresses" />
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-stone-900 tracking-tight">Địa chỉ giao hàng</h1>
          {!showAddForm && (
            <button
              type="button"
              onClick={() => { setShowAddForm(true); setEditingId(null); setFormError(''); }}
              className="btn-primary"
            >
              + Thêm địa chỉ
            </button>
          )}
        </div>

        {showAddForm && (
          <AddressForm
            initial={EMPTY_FORM}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => { setShowAddForm(false); setFormError(''); }}
            isPending={createMutation.isPending}
            error={formError}
          />
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-stone-100" />
            ))}
          </div>
        ) : addresses.length === 0 && !showAddForm ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center gap-4">
            <span className="text-5xl">📍</span>
            <div>
              <p className="font-bold text-stone-700">Chưa có địa chỉ nào</p>
              <p className="mt-1 text-sm text-muted">Thêm địa chỉ để đặt hàng nhanh hơn.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="btn-primary mt-2"
            >
              Thêm địa chỉ đầu tiên
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-warm ${
                  addr.isDefault ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-warm'
                }`}
              >
                {editingId === addr.id ? (
                  <AddressForm
                    initial={getEditInitial(addr)}
                    onSubmit={(data) => updateMutation.mutate({ id: addr.id, data })}
                    onCancel={() => { setEditingId(null); setFormError(''); }}
                    isPending={updateMutation.isPending}
                    error={formError}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-stone-900">{addr.fullName}</p>
                        <span className="text-sm text-stone-300">|</span>
                        <p className="text-sm text-muted">{addr.phone}</p>
                        {addr.isDefault && (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                            Mặc định
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {addr.street}, {addr.district}, {addr.city}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => { setEditingId(addr.id); setShowAddForm(false); setFormError(''); }}
                        className="cursor-pointer rounded-lg border border-warm px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-warm-100 transition-colors"
                      >
                        Sửa
                      </button>
                      {!addr.isDefault && (
                        <button
                          type="button"
                          onClick={() => setDefaultMutation.mutate(addr.id)}
                          disabled={setDefaultMutation.isPending}
                          className="cursor-pointer rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                        >
                          Đặt mặc định
                        </button>
                      )}
                      {deletingId === addr.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(addr.id)}
                            disabled={deleteMutation.isPending}
                            className="cursor-pointer rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                          >
                            Xác nhận xóa
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="cursor-pointer rounded-lg border border-warm px-3 py-1.5 text-xs text-stone-700 hover:bg-warm-100 transition-colors"
                          >
                            Hủy
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingId(addr.id)}
                          className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
