-- CreateEnum
CREATE TYPE "WalletTopupStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "WalletTopupRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "status" "WalletTopupStatus" NOT NULL DEFAULT 'PENDING',
    "transferCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankAccountNumber" TEXT NOT NULL,
    "bankAccountName" TEXT NOT NULL,
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletTopupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletTopupRequest_transferCode_key" ON "WalletTopupRequest"("transferCode");

-- CreateIndex
CREATE INDEX "WalletTopupRequest_userId_idx" ON "WalletTopupRequest"("userId");

-- CreateIndex
CREATE INDEX "WalletTopupRequest_walletId_idx" ON "WalletTopupRequest"("walletId");

-- CreateIndex
CREATE INDEX "WalletTopupRequest_status_idx" ON "WalletTopupRequest"("status");

-- CreateIndex
CREATE INDEX "WalletTopupRequest_createdAt_idx" ON "WalletTopupRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "WalletTopupRequest" ADD CONSTRAINT "WalletTopupRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTopupRequest" ADD CONSTRAINT "WalletTopupRequest_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTopupRequest" ADD CONSTRAINT "WalletTopupRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
