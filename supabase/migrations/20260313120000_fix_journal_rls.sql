-- Disable Row Level Security for simple local usage without Auth
ALTER TABLE public.journal DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to clean up)
DROP POLICY IF EXISTS "Users can read their own journal entries" ON public.journal;
DROP POLICY IF EXISTS "Users can insert their own journal entries" ON public.journal;
DROP POLICY IF EXISTS "Users can update their own journal entries" ON public.journal;
DROP POLICY IF EXISTS "Users can delete their own journal entries" ON public.journal;
