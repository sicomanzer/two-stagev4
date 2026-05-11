CREATE TABLE IF NOT EXISTS public.stock_market_snapshot (
    ticker TEXT PRIMARY KEY,
    price NUMERIC,
    pe NUMERIC,
    pbv NUMERIC,
    dividend_yield NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.stock_market_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.stock_market_snapshot
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Allow service role full access" ON public.stock_market_snapshot
    FOR ALL
    USING (true)
    WITH CHECK (true);

