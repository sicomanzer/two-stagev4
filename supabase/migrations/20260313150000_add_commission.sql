-- Add commission column to portfolio_transactions table
ALTER TABLE public.portfolio_transactions 
ADD COLUMN IF NOT EXISTS commission DECIMAL(15, 2) DEFAULT 0;
