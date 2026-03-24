CREATE TABLE IF NOT EXISTS public.stock_fundamentals (
    ticker TEXT PRIMARY KEY,
    company_name TEXT,
    sector TEXT,
    industry TEXT,
    history JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.stock_fundamentals ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (For Next.js API to fetch without auth)
CREATE POLICY "Allow public read access" ON public.stock_fundamentals
    FOR SELECT
    TO public
    USING (true);

-- Allow authenticated/service role full access
CREATE POLICY "Allow service role full access" ON public.stock_fundamentals
    FOR ALL
    USING (true)
    WITH CHECK (true);
