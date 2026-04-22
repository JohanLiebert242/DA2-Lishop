'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AccountSidebar } from '../../components/account-sidebar';
import { MiniHeader } from '../../components/mini-header';
import { MiniFooter } from '../../components/mini-footer';
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
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Họ và tên *</label>
          <input
            value={form.fullName}
            onChange={set('fullName')}
            placeholder="Nguyễn Văn A"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Số điện thoại *</label>
          <input
            value={form.phone}
            onChange={set('phone')}
            placeholder="0912 345 678"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Địa chỉ (số nhà, tên đường) *</label>
          <input
            value={form.street}
            onChange={set('street')}
            placeholder="123 Nguyễn Huệ"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Quận / Huyện *</label>
          <input
            value={form.district}
            onChange={set('district')}
            placeholder="Quận 1"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tỉnh / Thành phố *</label>
          <input
            value={form.city}
            onChange={set('city')}
            placeholder="Hồ Chí Minh"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
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
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isPending ? 'Đang lưu...' : 'Lưu địa chỉ'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
    <div className="flex min-h-screen flex-col bg-warm">
      <MiniHeader title="Địa chỉ giao hàng" />
      <main className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-8">
        <AccountSidebar activeSection="addresses" />
        <div className="flex-1 min-w-0 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900">Địa chỉ giao hàng</h1>
            {!showAddForm && (
              <button
                type="button"
                onClick={() => { setShowAddForm(true); setEditingId(null); setFormError(''); }}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                + Thêm địa chỉ
              </button>
            )}
          </div>

          {/* Add form */}
          {showAddForm && (
            <AddressForm
              initial={EMPTY_FORM}
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => { setShowAddForm(false); setFormError(''); }}
              isPending={createMutation.isPending}
              error={formError}
            />
          )}

          {/* Address list */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : addresses.length === 0 && !showAddForm ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <p className="text-4xl mb-3">📍</p>
              <p className="font-semibold text-gray-700">Chưa có địa chỉ nào</p>
              <p className="mt-1 text-sm text-gray-500">Thêm địa chỉ để đặt hàng nhanh hơn.</p>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="mt-4 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Thêm địa chỉ đầu tiên
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`rounded-xl border bg-white p-4 shadow-sm ${
                    addr.isDefault ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-gray-200'
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
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900">{addr.fullName}</p>
                            <span className="text-sm text-gray-500">|</span>
                            <p className="text-sm text-gray-600">{addr.phone}</p>
                            {addr.isDefault && (
                              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                Mặc định
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {addr.street}, {addr.district}, {addr.city}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => { setEditingId(addr.id); setShowAddForm(false); setFormError(''); }}
                            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Sửa
                          </button>
                          {!addr.isDefault && (
                            <button
                              type="button"
                              onClick={() => setDefaultMutation.mutate(addr.id)}
                              disabled={setDefaultMutation.isPending}
                              className="rounded-md border border-indigo-200 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
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
                                className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                Xác nhận xóa
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingId(null)}
                                className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                              >
                                Hủy
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingId(addr.id)}
                              className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <MiniFooter />
    </div>
  );
}
