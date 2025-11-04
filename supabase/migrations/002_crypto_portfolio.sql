-- Crypto portfolio table with RLS policies using Clerk user IDs

CREATE TABLE IF NOT EXISTS public.crypto_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  avg_price_usd NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.crypto_portfolio ENABLE ROW LEVEL SECURITY;

-- Read own rows
CREATE POLICY "Users can read own portfolio" ON public.crypto_portfolio
  FOR SELECT USING (auth.jwt() ->> 'sub' = user_id);

-- Insert own rows
CREATE POLICY "Users can insert own portfolio" ON public.crypto_portfolio
  FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = user_id);

-- Update own rows
CREATE POLICY "Users can update own portfolio" ON public.crypto_portfolio
  FOR UPDATE USING (auth.jwt() ->> 'sub' = user_id);

-- Delete own rows
CREATE POLICY "Users can delete own portfolio" ON public.crypto_portfolio
  FOR DELETE USING (auth.jwt() ->> 'sub' = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crypto_portfolio_user_id ON public.crypto_portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_portfolio_code ON public.crypto_portfolio(code);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_crypto_portfolio_updated_at
  BEFORE UPDATE ON public.crypto_portfolio
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

