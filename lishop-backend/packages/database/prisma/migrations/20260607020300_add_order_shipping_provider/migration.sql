-- Add shipping provider to Order
DO $$ BEGIN
  CREATE TYPE "ShippingProvider" AS ENUM ('GHN', 'GHTK', 'VIETTEL_POST');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingProvider" "ShippingProvider" NOT NULL DEFAULT 'GHN';

