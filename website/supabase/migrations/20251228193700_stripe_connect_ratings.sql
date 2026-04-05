-- Stripe Connect and Rating Constraints
-- Adds stripe_connect_id for creator payouts and unique constraint for ratings

-- ============================================
-- PROFILES: Add stripe_connect_id for creator payouts
-- ============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect ON public.profiles(stripe_connect_id) 
WHERE stripe_connect_id IS NOT NULL;

-- ============================================
-- RATINGS: Add unique constraint for upsert support
-- Ensures one rating per user per pack
-- ============================================
-- First, remove any duplicate ratings (keep the most recent)
DELETE FROM public.ratings a
USING public.ratings b
WHERE a.id < b.id 
AND a.pack_id = b.pack_id 
AND a.user_id = b.user_id;

-- Add unique constraint (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ratings_pack_user_unique'
    ) THEN
        ALTER TABLE public.ratings
        ADD CONSTRAINT ratings_pack_user_unique UNIQUE (pack_id, user_id);
    END IF;
END $$;
