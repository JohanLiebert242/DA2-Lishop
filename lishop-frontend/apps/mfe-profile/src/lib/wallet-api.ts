const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) },
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
