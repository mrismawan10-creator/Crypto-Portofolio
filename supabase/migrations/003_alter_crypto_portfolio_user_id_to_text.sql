-- Align crypto_portfolio.user_id type with Clerk user IDs (text)
-- Fixes runtime error: invalid input syntax for type uuid: "user_..."

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'crypto_portfolio'
      AND column_name = 'user_id'
      AND data_type IN ('uuid')
  ) THEN
    -- Change column type from uuid -> text, preserving data
    ALTER TABLE public.crypto_portfolio
      ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;
END $$;

-- Ensure index still exists on user_id for lookups
CREATE INDEX IF NOT EXISTS idx_crypto_portfolio_user_id
  ON public.crypto_portfolio(user_id);
