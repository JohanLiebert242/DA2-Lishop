import { createApiFetch } from '@lishop/shared';

const apiFetch = createApiFetch(
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000',
  process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001',
);

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

export type WalletTopupStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface WalletTopupRequest {
  id: string;
  userId: string;
  walletId: string;
  amountVnd: number;
  status: WalletTopupStatus;
  transferCode: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  adminNote: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransferInfo {
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  transferCode: string;
  amountVnd: number;
}

export interface TopupResponse {
  request: WalletTopupRequest;
  bankTransfer: BankTransferInfo;
  paymentUrl: null;
}

export const walletApi = {
  getWallet: () => apiFetch<WalletInfo>('/wallet'),
  getTransactions: () => apiFetch<WalletTx[]>('/wallet/transactions'),
  getTopupRequests: () => apiFetch<WalletTopupRequest[]>('/wallet/topup-requests'),
  topUp: (amountVnd: number, transferCode?: string) =>
    apiFetch<TopupResponse>('/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ amountVnd, ...(transferCode ? { transferCode } : {}) }),
    }),
  convertPoints: (points: number) =>
    apiFetch<{ wallet: WalletInfo; pointsConverted: number; amountCredited: number }>(
      '/wallet/convert-points',
      { method: 'POST', body: JSON.stringify({ points }) },
    ),
};
