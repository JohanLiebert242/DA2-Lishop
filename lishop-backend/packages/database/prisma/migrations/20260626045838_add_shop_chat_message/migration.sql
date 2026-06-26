-- CreateTable
CREATE TABLE "ShopChatMessage" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isFromShop" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopChatMessage_shopId_idx" ON "ShopChatMessage"("shopId");

-- CreateIndex
CREATE INDEX "ShopChatMessage_shopId_createdAt_idx" ON "ShopChatMessage"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "ShopChatMessage_userId_idx" ON "ShopChatMessage"("userId");

-- AddForeignKey
ALTER TABLE "ShopChatMessage" ADD CONSTRAINT "ShopChatMessage_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopChatMessage" ADD CONSTRAINT "ShopChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
