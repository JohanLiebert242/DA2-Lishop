-- Add optional SKU on Product (used by seed and admin tooling)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sku" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_key" ON "Product"("sku");

