export type PortfolioRow = {
  id: string;
  user_id: string;
  code: string;
  name: string;
  amount: number;
  avg_price_usd: number;
  updated_at: string;
};

export type PortfolioWithComputed = PortfolioRow & {
  current_price_usd?: number;
  current_value_usd?: number;
  pl_usd?: number;
  pl_percent?: number;
};

