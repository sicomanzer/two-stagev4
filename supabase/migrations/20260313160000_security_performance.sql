
-- Add user_id column to tables for future auth integration
ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.journal ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_lookup ON public.portfolio_transactions (portfolio_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON public.portfolios (user_id);

-- Enable RLS on all tables (Security Best Practice)
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal ENABLE ROW LEVEL SECURITY;

-- Create Policies (Initially allow public access for local dev, but ready for auth)
-- NOTE: In production, change 'true' to 'auth.uid() = user_id'

-- Portfolios
CREATE POLICY "Enable read access for all users" ON public.portfolios FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.portfolios FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.portfolios FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.portfolios FOR DELETE USING (true);

-- Transactions
CREATE POLICY "Enable read access for all users" ON public.portfolio_transactions FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.portfolio_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.portfolio_transactions FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.portfolio_transactions FOR DELETE USING (true);

-- Journal
CREATE POLICY "Enable read access for all users" ON public.journal FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.journal FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.journal FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.journal FOR DELETE USING (true);
