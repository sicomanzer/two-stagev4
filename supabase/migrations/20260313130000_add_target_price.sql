-- Add target_price column to portfolio table
ALTER TABLE public.portfolio 
ADD COLUMN IF NOT EXISTS target_price DECIMAL(10, 2);
