-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "shopId" TEXT;

-- CreateIndex
CREATE INDEX "OrderItem_shopId_idx" ON "OrderItem"("shopId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
