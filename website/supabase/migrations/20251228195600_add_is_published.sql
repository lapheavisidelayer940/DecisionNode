-- Add is_published field to packs
-- Separates publishing (visible in marketplace) from embedding (has vectors)

ALTER TABLE public.packs 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Create index for filtering published packs
CREATE INDEX IF NOT EXISTS idx_packs_published ON public.packs(is_published) WHERE is_published = true;

-- Update existing embedded packs to also be published
UPDATE public.packs SET is_published = true WHERE is_embedded = true;

-- Recreate the view to include is_published
DROP VIEW IF EXISTS public.packs_with_ratings;

CREATE VIEW public.packs_with_ratings AS
SELECT 
    p.*,
    COALESCE(AVG(r.score), 0) as avg_rating,
    COUNT(r.id) as rating_count,
    pr.username as author_username,
    pr.display_name as author_display_name,
    pr.avatar_url as author_avatar
FROM public.packs p
LEFT JOIN public.ratings r ON p.id = r.pack_id
LEFT JOIN public.profiles pr ON p.author_id = pr.id
GROUP BY p.id, pr.id;
