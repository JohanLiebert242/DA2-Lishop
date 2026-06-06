'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AccountSidebar } from '../../components/account-sidebar';
import { addressesApi, Address, CreateAddressInput } from '../../lib/addresses-api';

const DEFAULT_MAP_CENTER = { lat: 10.7769, lon: 106.7009 };
const MAP_TILE_SIZE = 256;
const MAP_ZOOM = 14;

const EMPTY_FORM: CreateAddressInput = {
  fullName: '',
  phone: '',
  street: '',
  district: '',
  city: '',
  country: 'Viet Nam',
  latitude: DEFAULT_MAP_CENTER.lat,
  longitude: DEFAULT_MAP_CENTER.lon,
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

interface MapPoint {
  lat: number;
  lon: number;
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
    country: address.country ?? 'Viet Nam',
    latitude: Number(result.lat),
    longitude: Number(result.lon),
  };
}

function getAddressLabel(form: CreateAddressInput) {
  return [form.street, form.district, form.city].filter(Boolean).join(', ');
}

function latLonToPixel(lat: number, lon: number, zoom: number) {
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const scale = MAP_TILE_SIZE * 2 ** zoom;

  return {
    x: ((lon + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function pixelToLatLon(x: number, y: number, zoom: number) {
  const scale = MAP_TILE_SIZE * 2 ** zoom;
  const lon = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

  return { lat, lon };
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
    throw new Error('Khong the kiem tra dia chi luc nay, vui long thu lai.');
  }

  return response.json() as Promise<GeocodeResult[]>;
}

async function reverseGeocode(point: MapPoint): Promise<GeocodeResult> {
  const params = new URLSearchParams({
    lat: String(point.lat),
    lon: String(point.lon),
    format: 'jsonv2',
    addressdetails: '1',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Khong the lay dia chi tu vi tri ban do.');
  }

  return response.json() as Promise<GeocodeResult>;
}

function AddressPickerMap({
  point,
  label,
  isResolving,
  onPick,
}: {
  point: MapPoint;
  label: string;
  isResolving: boolean;
  onPick: (point: MapPoint) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const centerPixel = latLonToPixel(point.lat, point.lon, MAP_ZOOM);
  const centerTileX = Math.floor(centerPixel.x / MAP_TILE_SIZE);
  const centerTileY = Math.floor(centerPixel.y / MAP_TILE_SIZE);
  const offsetX = centerPixel.x - centerTileX * MAP_TILE_SIZE;
  const offsetY = centerPixel.y - centerTileY * MAP_TILE_SIZE;
  const tiles = [];

  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      tiles.push({ x: centerTileX + dx, y: centerTileY + dy, dx, dy });
    }
  }

  function handleMapClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    const nextPixelX = centerPixel.x + clickX - rect.width / 2;
    const nextPixelY = centerPixel.y + clickY - rect.height / 2;
    onPick(pixelToLatLon(nextPixelX, nextPixelY, MAP_ZOOM));
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div
        ref={mapRef}
        role="button"
        tabIndex={0}
        onClick={handleMapClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') onPick(point);
        }}
        className="relative h-72 cursor-crosshair overflow-hidden bg-stone-100"
        aria-label="Chon vi tri tren ban do"
      >
        <div className="absolute left-1/2 top-1/2 h-0 w-0">
          {tiles.map((tile) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${tile.x}-${tile.y}`}
              src={`https://tile.openstreetmap.org/${MAP_ZOOM}/${tile.x}/${tile.y}.png`}
              alt=""
              className="absolute h-64 w-64 select-none"
              draggable={false}
              style={{
                left: tile.dx * MAP_TILE_SIZE - offsetX,
                top: tile.dy * MAP_TILE_SIZE - offsetY,
              }}
            />
          ))}
        </div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-full flex-col items-center">
          <div className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-black text-white shadow-brand">
            Giao den day
          </div>
          <div className="h-8 w-8 rounded-full border-4 border-white bg-indigo-600 shadow-lg" />
          <div className="h-3 w-3 -translate-y-1 rotate-45 bg-indigo-600" />
        </div>
        {isResolving && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-bold text-indigo-700 backdrop-blur-sm">
            Dang doc dia chi tu ban do...
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs text-stone-600">
        <span className="font-semibold">{label || 'Click tren ban do hoac tim dia chi de dat pin'}</span>
        <span className="font-mono">{point.lat.toFixed(5)}, {point.lon.toFixed(5)}</span>
      </div>
    </div>
  );
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
  const initialPoint = {
    lat: initial.latitude ?? DEFAULT_MAP_CENTER.lat,
    lon: initial.longitude ?? DEFAULT_MAP_CENTER.lon,
  };
  const [form, setForm] = useState<CreateAddressInput>({ ...initial, latitude: initialPoint.lat, longitude: initialPoint.lon });
  const [query, setQuery] = useState(getAddressLabel(initial));
  const [selectedPlace, setSelectedPlace] = useState<GeocodeResult | null>(null);
  const [mapPoint, setMapPoint] = useState<MapPoint>(initialPoint);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolvingMap, setIsResolvingMap] = useState(false);
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

  function applyGeocodeResult(result: GeocodeResult) {
    const parsed = buildAddressFromResult(result);
    const nextPoint = { lat: parsed.latitude ?? DEFAULT_MAP_CENTER.lat, lon: parsed.longitude ?? DEFAULT_MAP_CENTER.lon };

    setSelectedPlace(result);
    setMapPoint(nextPoint);
    setForm((current) => ({
      ...current,
      street: parsed.street,
      district: parsed.district,
      city: parsed.city,
      country: parsed.country,
      latitude: nextPoint.lat,
      longitude: nextPoint.lon,
    }));
    setQuery(result.display_name);
    setResults([]);
    setGeoError('');
  }

  async function handleSearch() {
    const trimmed = query.trim();
    setGeoError('');
    setResults([]);

    if (trimmed.length < 8) {
      setGeoError('Vui long nhap dia chi cu the hon truoc khi tim.');
      return;
    }

    setIsSearching(true);
    try {
      const data = await searchAddresses(trimmed);
      if (data.length === 0) {
        setGeoError('Khong tim thay dia chi phu hop. Vui long thu tu khoa khac.');
      }
      setResults(data);
    } catch (err) {
      setGeoError(err instanceof Error ? err.message : 'Khong the kiem tra dia chi.');
    } finally {
      setIsSearching(false);
    }
  }

  async function handleMapPick(point: MapPoint) {
    setMapPoint(point);
    setForm((current) => ({ ...current, latitude: point.lat, longitude: point.lon }));
    setGeoError('');
    setIsResolvingMap(true);

    try {
      const result = await reverseGeocode(point);
      applyGeocodeResult({
        ...result,
        lat: String(point.lat),
        lon: String(point.lon),
      });
    } catch (err) {
      clearSelectedAddress();
      setGeoError(err instanceof Error ? err.message : 'Khong the doc dia chi tu ban do.');
    } finally {
      setIsResolvingMap(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoError('Trinh duyet khong ho tro lay vi tri hien tai.');
      return;
    }

    setIsResolvingMap(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleMapPick({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => {
        setIsResolvingMap(false);
        setGeoError('Khong the lay vi tri hien tai. Ban co the click truc tiep tren ban do.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const hasContact = Boolean(form.fullName.trim() && form.phone.trim());
  const hasAddressFields = Boolean(form.street.trim() && form.district.trim() && form.city.trim());
  const hasCoordinates = typeof form.latitude === 'number' && typeof form.longitude === 'number';
  const canSave = hasContact && hasAddressFields && hasCoordinates && !isPending && !isResolvingMap;

  return (
    <div className="rounded-xl border border-warm bg-warm-100 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold text-stone-700">Ho va ten *</label>
          <input
            value={form.fullName}
            onChange={setContact('fullName')}
            placeholder="Nguyen Van A"
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-stone-700">So dien thoai *</label>
          <input
            value={form.phone}
            onChange={setContact('phone')}
            placeholder="0912 345 678"
            className="input-field"
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-stone-200 bg-white p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label className="block text-xs font-bold text-stone-700">Tim dia chi hoac chon tren ban do *</label>
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={isResolvingMap}
            className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Dung vi tri hien tai
          </button>
        </div>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              clearSelectedAddress();
            }}
            placeholder="Nhap so nha, duong, phuong, quan, thanh pho"
            className="input-field"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSearching ? 'Dang tim...' : 'Tim'}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">Chon goi y hoac click tren ban do de dat pin giao hang.</p>

        {geoError && <p className="mt-2 text-xs font-semibold text-red-600">{geoError}</p>}

        {results.length > 0 && (
          <div className="mt-3 space-y-2">
            {results.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => applyGeocodeResult(result)}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-left text-sm text-stone-700 transition hover:border-indigo-200 hover:bg-indigo-50"
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3">
          <AddressPickerMap
            point={mapPoint}
            label={selectedPlace?.display_name ?? getAddressLabel(form)}
            isResolving={isResolvingMap}
            onPick={handleMapPick}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold text-stone-700">Dia chi *</label>
          <input
            value={form.street}
            onChange={setAddressField('street')}
            placeholder="Chon tu goi y hoac ban do"
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-stone-700">Quan / Huyen *</label>
          <input
            value={form.district}
            onChange={setAddressField('district')}
            placeholder="Quan 1"
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-stone-700">Tinh / Thanh pho *</label>
          <input
            value={form.city}
            onChange={setAddressField('city')}
            placeholder="Ho Chi Minh"
            className="input-field"
          />
        </div>
      </div>

      {hasCoordinates && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700">
          Da gan toa do giao hang: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
        </div>
      )}

      {(error || (!hasCoordinates && hasAddressFields)) && (
        <p className="mt-2 text-xs text-red-600">
          {error || 'Vui long chon vi tri tren ban do de xac thuc dia chi truoc khi luu.'}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => canSave && onSubmit(form)}
          disabled={!canSave}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:transform-none"
        >
          {isPending ? 'Dang luu...' : 'Luu dia chi'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-xl border border-warm px-4 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-warm-100"
        >
          Huy
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
      ...(addr.latitude !== null && addr.latitude !== undefined && { latitude: addr.latitude }),
      ...(addr.longitude !== null && addr.longitude !== undefined && { longitude: addr.longitude }),
    };
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-8">
      <AccountSidebar activeSection="addresses" />
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-stone-900">Dia chi giao hang</h1>
            <p className="mt-0.5 text-sm text-muted">Tim dia chi, dat pin tren ban do va luu toa do de san sang cho giao van sau nay.</p>
          </div>
          {!showAddForm && addresses.length > 0 && (
            <button
              type="button"
              onClick={() => { setShowAddForm(true); setEditingId(null); setFormError(''); }}
              className="btn-primary"
            >
              + Them dia chi
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
            <span className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700">MAP</span>
            <div>
              <p className="font-bold text-stone-700">Chua co dia chi nao</p>
              <p className="mt-1 text-sm text-muted">Them dia chi co pin ban do de dat hang nhanh hon.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="btn-primary mt-2"
            >
              Them dia chi dau tien
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
                            Mac dinh
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {addr.street}, {addr.district}, {addr.city}
                      </p>
                      {addr.latitude !== null && addr.latitude !== undefined && addr.longitude !== null && addr.longitude !== undefined && (
                        <p className="mt-1 text-xs font-mono text-emerald-700">
                          {addr.latitude.toFixed(5)}, {addr.longitude.toFixed(5)}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => { setEditingId(addr.id); setShowAddForm(false); setFormError(''); }}
                        className="cursor-pointer rounded-lg border border-warm px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-warm-100"
                      >
                        Sua
                      </button>
                      {!addr.isDefault && (
                        <button
                          type="button"
                          onClick={() => setDefaultMutation.mutate(addr.id)}
                          disabled={setDefaultMutation.isPending}
                          className="cursor-pointer rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Dat mac dinh
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
                            Xac nhan xoa
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="cursor-pointer rounded-lg border border-warm px-3 py-1.5 text-xs text-stone-700 transition-colors hover:bg-warm-100"
                          >
                            Huy
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingId(addr.id)}
                          className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                        >
                          Xoa
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
