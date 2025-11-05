-- Add optional color for chart per asset
ALTER TABLE IF NOT EXISTS public.crypto_portfolio
  ADD COLUMN IF NOT EXISTS color_hex TEXT;
