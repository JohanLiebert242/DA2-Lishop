-- AlterEnum: add ZALOPAY, WALLET to PaymentMethod
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'ZALOPAY';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'WALLET';

-- CreateEnum: WalletTxType
DO $$ BEGIN
  CREATE TYPE "WalletTxType" AS ENUM ('TOPUP', 'PAYMENT', 'REFUND', 'WITHDRAW', 'POINTS_CONVERSION');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: RefundMethod
DO $$ BEGIN
  CREATE TYPE "RefundMethod" AS ENUM ('ORIGINAL_PAYMENT', 'WALLET', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: RefundStatus
DO $$ BEGIN
  CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateTable: Wallet
CREATE TABLE IF NOT EXISTS "Wallet" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "balanceVnd" INTEGER NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Wallet_userId_key" ON "Wallet"("userId");
CREATE INDEX IF NOT EXISTS "Wallet_userId_idx" ON "Wallet"("userId");

-- CreateTable: WalletTransaction
CREATE TABLE IF NOT EXISTS "WalletTransaction" (
    "id"           TEXT NOT NULL,
    "walletId"     TEXT NOT NULL,
    "type"         "WalletTxType" NOT NULL,
    "amountVnd"    INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description"  TEXT,
    "referenceId"  TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");
CREATE INDEX IF NOT EXISTS "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

-- CreateTable: Invoice
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id"             TEXT NOT NULL,
    "orderId"        TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "invoiceNo"      TEXT NOT NULL,
    "billingName"    TEXT NOT NULL,
    "billingEmail"   TEXT NOT NULL,
    "billingAddress" TEXT NOT NULL,
    "billingPhone"   TEXT NOT NULL,
    "subtotalVnd"    INTEGER NOT NULL,
    "discountVnd"    INTEGER NOT NULL DEFAULT 0,
    "shippingFeeVnd" INTEGER NOT NULL DEFAULT 0,
    "vatPercent"     INTEGER NOT NULL DEFAULT 10,
    "vatVnd"         INTEGER NOT NULL,
    "totalVnd"       INTEGER NOT NULL,
    "issuedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_orderId_key" ON "Invoice"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");
CREATE INDEX IF NOT EXISTS "Invoice_userId_idx" ON "Invoice"("userId");
CREATE INDEX IF NOT EXISTS "Invoice_issuedAt_idx" ON "Invoice"("issuedAt");

-- CreateTable: Refund
CREATE TABLE IF NOT EXISTS "Refund" (
    "id"          TEXT NOT NULL,
    "orderId"     TEXT NOT NULL,
    "returnId"    TEXT,
    "userId"      TEXT NOT NULL,
    "amountVnd"   INTEGER NOT NULL,
    "method"      "RefundMethod" NOT NULL,
    "status"      "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "reason"      TEXT,
    "adminNote"   TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Refund_returnId_key" ON "Refund"("returnId");
CREATE INDEX IF NOT EXISTS "Refund_orderId_idx" ON "Refund"("orderId");
CREATE INDEX IF NOT EXISTS "Refund_userId_idx" ON "Refund"("userId");
CREATE INDEX IF NOT EXISTS "Refund_status_idx" ON "Refund"("status");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Refund" ADD CONSTRAINT "Refund_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Some environments were created via `prisma db push` and include ReturnRequest;
-- the migrations folder historically did not include ReturnRequest creation.
-- Make this FK best-effort so `migrate reset` can run on a fresh database.
DO $$ BEGIN
  ALTER TABLE "Refund" ADD CONSTRAINT "Refund_returnId_fkey"
    FOREIGN KEY ("returnId") REFERENCES "ReturnRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN undefined_table THEN null;
  WHEN duplicate_object THEN null;
END $$;
