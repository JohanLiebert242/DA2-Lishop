-- Add shipping weight to Product for checkout estimates and seed data
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "weightGrams" INTEGER NOT NULL DEFAULT 500;

