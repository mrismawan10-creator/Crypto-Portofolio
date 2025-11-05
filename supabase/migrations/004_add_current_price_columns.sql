-- Add columns to store latest market price and computed current value
ALTER TABLE IF NOT EXISTS public.crypto_portfolio
  ADD COLUMN IF NOT EXISTS current_price_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS current_value_usd NUMERIC;

-- Optional indexes to speed up queries by code/user
CREATE INDEX IF NOT EXISTS idx_crypto_portfolio_current_price
  ON public.crypto_portfolio(current_price_usd);
CREATE INDEX IF NOT EXISTS idx_crypto_portfolio_current_value
  ON public.crypto_portfolio(current_value_usd);
