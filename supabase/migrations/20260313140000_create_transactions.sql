-- Create Portfolio Transactions Table with gen_random_uuid() which is built-in for Postgres 13+
CREATE TABLE IF NOT EXISTS public.portfolio_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
    volume DECIMAL(15, 4) NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (but disable for local dev as requested previously)
ALTER TABLE public.portfolio_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_transactions DISABLE ROW LEVEL SECURITY;
