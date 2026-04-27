'use client';

import { useState } from 'react';

async function applyToCart(code: string): Promise<string> {
  const m = typeof window !== 'undefined' ? document.cookie.match(/(?:^|;\s*)lishop_at=([^;]*)/) : null;
  const token = m?.[1] ? decodeURIComponent(m[1]) : null;
  if (!token) return 'Vui lòng đăng nhập để sử dụng mã giảm giá';

  const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
  const res = await fetch(`${API_URL}/cart/coupon`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code }),
  });
  const json = await res.json();
  if (!res.ok) return json.message ?? 'Mã giảm giá không hợp lệ';
  return 'success';
}

export function CouponWidget() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleApply() {
    if (!code.trim()) return;
    setStatus('loading');
    setMessage('');
    const result = await applyToCart(code.trim().toUpperCase());
    if (result === 'success') {
      setStatus('success');
      setMessage(`Mã "${code.toUpperCase()}" đã được áp dụng vào giỏ hàng!`);
      setCode('');
    } else {
      setStatus('error');
      setMessage(result);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Nhập mã giảm giá</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setStatus('idle'); setMessage(''); }}
          placeholder="VD: SAVE10"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm uppercase tracking-wider focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          disabled={status === 'loading' || !code.trim()}
          onClick={handleApply}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {status === 'loading' ? '...' : 'Áp dụng'}
        </button>
      </div>
      {message && (
        <p className={`mt-2 text-xs ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}
      {status === 'success' && (
        <a
          href="http://localhost:3003/cart"
          className="mt-2 block text-xs text-indigo-600 hover:underline"
        >
          Xem giỏ hàng →
        </a>
      )}
    </div>
  );
}
