'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@lishop/ui';
import { createApiFetch } from '@lishop/shared';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
const SHELL_URL = process.env['NEXT_PUBLIC_SHELL_URL'] ?? 'http://localhost:3010';
const SELLER_URL = process.env['NEXT_PUBLIC_MFE_SELLER_URL'] ?? 'http://localhost:3011';
const apiFetch = createApiFetch(API_URL);

const STATUS_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  PENDING:  { label: 'Đang chờ duyệt', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: '⏳' },
  APPROVED: { label: 'Đã được duyệt', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '✅' },
  REJECTED: { label: 'Bị từ chối', color: 'bg-red-50 text-red-700 border-red-200', icon: '❌' },
};

export default function BecomeSellerPage() {
  const router = useRouter();
  const [existingShop, setExistingShop] = useState<{ name: string; status: string; slug: string } | null | undefined>(undefined);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ name: string; status: string; slug: string }>('/shops/me')
      .then(setExistingShop)
      .catch(() => setExistingShop(null));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Vui lòng nhập tên cửa hàng'); return; }
    setError('');
    setLoading(true);

    try {
      await apiFetch('/shops/register', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
        }),
      });
      toast.success('Đã gửi yêu cầu đăng ký! Admin sẽ xét duyệt sớm nhất.');
      router.push(SHELL_URL);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (existingShop === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-gray-500">Đang tải...</p>
      </div>
    );
  }

  // Already has a shop
  if (existingShop) {
    const meta = STATUS_LABEL[existingShop.status] ?? { label: existingShop.status, color: 'bg-stone-50 text-stone-600 border-stone-200', icon: '🏪' };
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-3xl">
            {meta.icon}
          </div>
          <h1 className="text-xl font-bold text-gray-900">{existingShop.name}</h1>
          <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold border ${meta.color}`}>
            {meta.icon} {meta.label}
          </span>
          {existingShop.status === 'APPROVED' && (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-gray-500">Cửa hàng của bạn đã sẵn sàng. Hãy bắt đầu bán hàng!</p>
              <a href={`${SELLER_URL}/dashboard`} className="inline-block w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">
                Vào bảng điều khiển
              </a>
            </div>
          )}
          {existingShop.status === 'PENDING' && (
            <p className="mt-4 text-sm text-gray-500">Yêu cầu đăng ký của bạn đang chờ admin xét duyệt. Bạn sẽ nhận được thông báo khi có kết quả.</p>
          )}
          {existingShop.status === 'REJECTED' && (
            <div className="mt-6">
              <p className="text-sm text-gray-500">Yêu cầu của bạn đã bị từ chối. Bạn có thể tạo yêu cầu hỗ trợ để biết thêm chi tiết.</p>
            </div>
          )}
          <a href={SHELL_URL} className="mt-4 inline-block text-sm font-semibold text-violet-600 hover:text-violet-700">← Về trang chủ</a>
        </div>
      </div>
    );
  }

  // No shop yet — show registration form
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
            <svg className="h-6 w-6 text-violet-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Đăng ký bán hàng</h1>
          <p className="mt-1 text-sm text-gray-500">Mở cửa hàng trên Lishop và bắt đầu kinh doanh</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tên cửa hàng *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              placeholder="VD: Shop thời trang XYZ"
              maxLength={100}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              placeholder="Giới thiệu ngắn về cửa hàng của bạn..."
              maxLength={2000}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Số điện thoại</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              placeholder="0901234567"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Địa chỉ</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              placeholder="Số nhà, đường, phường, quận..."
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </button>
        </form>
      </div>
    </div>
  );
}
