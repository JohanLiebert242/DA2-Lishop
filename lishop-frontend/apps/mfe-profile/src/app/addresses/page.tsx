'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AccountSidebar } from '../../components/account-sidebar';
import { addressesApi, Address, CreateAddressInput } from '../../lib/addresses-api';

const EMPTY_FORM: CreateAddressInput = {
  fullName: '',
  phone: '',
  street: '',
  district: '',
  city: '',
  country: 'Việt Nam',
};

interface GeocodeAddress {
  road?: string;
  house_number?: string;
  suburb?: string;
  city_district?: string;
  county?: string;
  city?: string;
  town?: string;
  state?: string;
  country?: string;
}

interface GeocodeResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: GeocodeAddress;
}

function buildAddressFromResult(result: GeocodeResult): CreateAddressInput {
  const address = result.address ?? {};
  const streetParts = [address.house_number, address.road].filter(Boolean);

  return {
    fullName: '',
    phone: '',
    street: streetParts.length > 0 ? streetParts.join(' ') : result.display_name.split(',')[0]?.trim() ?? '',
    district: address.city_district ?? address.suburb ?? address.county ?? '',
    city: address.city ?? address.town ?? address.state ?? '',
    country: address.country ?? 'Việt Nam',
  };
}

async function searchAddresses(query: string): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'vn',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Không thể kiểm tra địa chỉ lúc này, vui lòng thử lại.');
  }

  return response.json() as Promise<GeocodeResult[]>;
}

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
  const [query, setQuery] = useState([initial.street, initial.district, initial.city].filter(Boolean).join(', '));
  const [selectedPlace, setSelectedPlace] = useState<GeocodeResult | null>(null);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [geoError, setGeoError] = useState('');

  const setContact = (key: 'fullName' | 'phone') => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  function clearSelectedAddress() {
    setSelectedPlace(null);
  }

  const setAddressField = (key: 'street' | 'district' | 'city') => (event: React.ChangeEvent<HTMLInputElement>) => {
    clearSelectedAddress();
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  async function handleSearch() {
    const trimmed = query.trim();
    setGeoError('');
    setResults([]);

    if (trimmed.length < 8) {
      setGeoError('Vui lòng nhập địa chỉ cụ thể hơn trước khi tìm.');
      return;
    }

    setIsSearching(true);
    try {
      const data = await searchAddresses(trimmed);
      if (data.length === 0) {
        setGeoError('Không tìm thấy địa chỉ thật phù hợp. Vui lòng thử từ khóa khác.');
      }
      setResults(data);
    } catch (err) {
      setGeoError(err instanceof Error ? err.message : 'Không thể kiểm tra địa chỉ.');
    } finally {
      setIsSearching(false);
    }
  }

  function selectResult(result: GeocodeResult) {
    const parsed = buildAddressFromResult(result);
    setSelectedPlace(result);
    setForm((current) => ({
      ...current,
      street: parsed.street,
      district: parsed.district,
      city: parsed.city,
      country: parsed.country,
    }));
    setQuery(result.display_name);
    setResults([]);
    setGeoError('');
  }

  const hasContact = Boolean(form.fullName.trim() && form.phone.trim());
  const hasAddressFields = Boolean(form.street.trim() && form.district.trim() && form.city.trim());
  const canSave = hasContact && hasAddressFields && Boolean(selectedPlace) && !isPending;

  return (
    <div className="rounded-xl border border-warm bg-warm-100 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold text-stone-700">Họ và tên *</label>
          <input
            value={form.fullName}
            onChange={setContact('fullName')}
            placeholder="Nguyễn Văn A"
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-stone-700">Số điện thoại *</label>
          <input
            value={form.phone}
            onChange={setContact('phone')}
            placeholder="0912 345 678"
            className="input-field"
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-stone-200 bg-white p-3">
        <label className="mb-1 block text-xs font-bold text-stone-700">Tìm địa chỉ thật *</label>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              clearSelectedAddress();
            }}
            placeholder="Nhập số nhà, đường, phường, quận, thành phố"
            className="input-field"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSearching ? 'Đang tìm...' : 'Tìm'}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">Bạn cần chọn một kết quả đã được định vị trước khi lưu.</p>

        {geoError && <p className="mt-2 text-xs font-semibold text-red-600">{geoError}</p>}

        {results.length > 0 && (
          <div className="mt-3 space-y-2">
            {results.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => selectResult(result)}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-left text-sm text-stone-700 transition hover:border-indigo-200 hover:bg-indigo-50"
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold text-stone-700">Địa chỉ *</label>
          <input
            value={form.street}
            onChange={setAddressField('street')}
            placeholder="Chọn từ kết quả tìm kiếm"
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-stone-700">Quận / Huyện *</label>
          <input
            value={form.district}
            onChange={setAddressField('district')}
            placeholder="Quận 1"
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-stone-700">Tỉnh / Thành phố *</label>
          <input
            value={form.city}
            onChange={setAddressField('city')}
            placeholder="Hồ Chí Minh"
            className="input-field"
          />
        </div>
      </div>

      {selectedPlace && (
        <div className="mt-3 overflow-hidden rounded-xl border border-emerald-200 bg-white">
          <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs font-semibold text-emerald-700">
            <span>Đã xác thực địa chỉ trên bản đồ</span>
            <span>{Number(selectedPlace.lat).toFixed(5)}, {Number(selectedPlace.lon).toFixed(5)}</span>
          </div>
          <iframe
            title="Bản đồ địa chỉ đã chọn"
            className="h-48 w-full border-0"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?marker=${selectedPlace.lat},${selectedPlace.lon}&layer=mapnik`}
          />
        </div>
      )}

      {(error || (!selectedPlace && hasAddressFields)) && (
        <p className="mt-2 text-xs text-red-600">
          {error || 'Vui lòng chọn địa chỉ từ kết quả tìm kiếm để xác thực trước khi lưu.'}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => canSave && onSubmit(form)}
          disabled={!canSave}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:transform-none"
        >
          {isPending ? 'Đang lưu...' : 'Lưu địa chỉ'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-xl border border-warm px-4 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-warm-100"
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
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-stone-900">Địa chỉ giao hàng</h1>
            <p className="mt-0.5 text-sm text-muted">Địa chỉ mới phải được chọn từ kết quả bản đồ để đảm bảo là địa chỉ thật.</p>
          </div>
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
          <div className="card flex flex-col items-center justify-center gap-4 py-16 text-center">
            <span className="text-5xl">📍</span>
            <div>
              <p className="font-bold text-stone-700">Chưa có địa chỉ nào</p>
              <p className="mt-1 text-sm text-muted">Thêm địa chỉ đã xác thực để đặt hàng nhanh hơn.</p>
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
                      <div className="flex flex-wrap items-center gap-2">
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
                        className="cursor-pointer rounded-lg border border-warm px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-warm-100"
                      >
                        Sửa
                      </button>
                      {!addr.isDefault && (
                        <button
                          type="button"
                          onClick={() => setDefaultMutation.mutate(addr.id)}
                          disabled={setDefaultMutation.isPending}
                          className="cursor-pointer rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                            className="cursor-pointer rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Xác nhận xóa
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="cursor-pointer rounded-lg border border-warm px-3 py-1.5 text-xs text-stone-700 transition-colors hover:bg-warm-100"
                          >
                            Hủy
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingId(addr.id)}
                          className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
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
