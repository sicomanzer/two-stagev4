-- Favorites System Upgrades: notes, tags, sort_order
ALTER TABLE public.portfolio 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
