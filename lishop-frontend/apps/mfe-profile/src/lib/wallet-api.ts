const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

function getToken() {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)lishop_at=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Request failed');
  return (json.data ?? json) as T;
}

export interface WalletInfo {
  id: string;
  balanceVnd: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTx {
  id: string;
  type: 'TOPUP' | 'PAYMENT' | 'REFUND' | 'WITHDRAW' | 'POINTS_CONVERSION';
  amountVnd: number;
  balanceAfter: number;
  description: string | null;
  referenceId: string | null;
  createdAt: string;
}

export const walletApi = {
  getWallet: () => apiFetch<WalletInfo>('/wallet'),
  getTransactions: () => apiFetch<WalletTx[]>('/wallet/transactions'),
  topUp: (amountVnd: number) =>
    apiFetch<{ wallet: WalletInfo; paymentUrl: string | null }>('/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ amountVnd }),
    }),
  convertPoints: (points: number) =>
    apiFetch<{ wallet: WalletInfo; pointsConverted: number; amountCredited: number }>(
      '/wallet/convert-points',
      { method: 'POST', body: JSON.stringify({ points }) },
    ),
};
