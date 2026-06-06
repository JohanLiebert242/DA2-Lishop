-- CreateEnum: ReturnStatus
DO $$ BEGIN
  CREATE TYPE "ReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RECEIVED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: ReturnReason
DO $$ BEGIN
  CREATE TYPE "ReturnReason" AS ENUM ('DAMAGED', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'CHANGED_MIND', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateTable: ReturnRequest
CREATE TABLE IF NOT EXISTS "ReturnRequest" (
  "id"          TEXT NOT NULL,
  "orderId"     TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "status"      "ReturnStatus" NOT NULL DEFAULT 'PENDING',
  "reason"      "ReturnReason" NOT NULL,
  "description" TEXT,
  "adminNote"   TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ReturnRequest_orderId_key" ON "ReturnRequest"("orderId");
CREATE INDEX IF NOT EXISTS "ReturnRequest_userId_idx" ON "ReturnRequest"("userId");
CREATE INDEX IF NOT EXISTS "ReturnRequest_status_idx" ON "ReturnRequest"("status");

-- CreateTable: ReturnItem
CREATE TABLE IF NOT EXISTS "ReturnItem" (
  "id"              TEXT NOT NULL,
  "returnRequestId" TEXT NOT NULL,
  "orderItemId"     TEXT NOT NULL,
  "quantity"        INTEGER NOT NULL,
  CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ReturnItem_returnRequestId_idx" ON "ReturnItem"("returnRequestId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_returnRequestId_fkey"
    FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Link Refund.returnId -> ReturnRequest (best effort)
DO $$ BEGIN
  ALTER TABLE "Refund" ADD CONSTRAINT "Refund_returnId_fkey"
    FOREIGN KEY ("returnId") REFERENCES "ReturnRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN undefined_table THEN null;
  WHEN duplicate_object THEN null;
END $$;

