-- Create Journal Table
CREATE TABLE IF NOT EXISTS public.journal (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    date DATE NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('BUY', 'SELL', 'WATCH', 'NOTE')),
    price DECIMAL(10, 2),
    shares DECIMAL(15, 4),
    thesis TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable Row Level Security for simple local usage without Auth
ALTER TABLE public.journal DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to clean up)
DROP POLICY IF EXISTS "Users can read their own journal entries" ON public.journal;
DROP POLICY IF EXISTS "Users can insert their own journal entries" ON public.journal;
DROP POLICY IF EXISTS "Users can update their own journal entries" ON public.journal;
DROP POLICY IF EXISTS "Users can delete their own journal entries" ON public.journal;

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_journal_updated_at ON public.journal;
CREATE TRIGGER update_journal_updated_at
    BEFORE UPDATE ON public.journal
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
