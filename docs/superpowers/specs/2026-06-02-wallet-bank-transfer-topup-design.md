# Wallet Bank Transfer Topup Design

## Goal

Wallet top-up must require a real bank transfer workflow. Pressing top-up must not immediately increase wallet balance.

## Phase 1 And 2 Scope

- User creates a wallet top-up request.
- System returns bank transfer instructions with a unique transfer code.
- Request is stored as `PENDING`.
- Wallet balance is unchanged while the request is pending.
- Admin can list top-up requests, approve them after checking bank transfer, or reject them.
- Approving a request credits the user's wallet and records a `TOPUP` wallet transaction.
- Rejecting a request records the admin note and never credits the wallet.

## Bank Transfer Instruction

Phase 1 uses configured static bank details:

- Bank: Lishop Demo Bank
- Account number: 1900 6868 6868
- Account name: CONG TY TNHH LISHOP
- Transfer content: generated code like `LSW-YYYYMMDD-XXXXXX`

These values can later move to environment variables or payment provider config.

## Data Model

Add `WalletTopupRequest`:

- `id`
- `userId`
- `walletId`
- `amountVnd`
- `status`: `PENDING | APPROVED | REJECTED`
- `transferCode`
- `bankName`
- `bankAccountNumber`
- `bankAccountName`
- `adminNote`
- `reviewedById`
- `reviewedAt`
- timestamps

## API

User wallet APIs:

- `POST /wallet/topup`: create pending request and return transfer instructions.
- `GET /wallet/topup-requests`: list current user's requests.

Admin APIs:

- `GET /admin/wallet-topups`: list all top-up requests.
- `PATCH /admin/wallet-topups/:id/approve`: approve and credit wallet.
- `PATCH /admin/wallet-topups/:id/reject`: reject without credit.

## Safety Rules

- `topUp()` must not call `repo.credit()`.
- Only approving a `PENDING` top-up request can credit wallet.
- Approved/rejected requests cannot be processed again.
- Approval and wallet credit happen in one database transaction.
