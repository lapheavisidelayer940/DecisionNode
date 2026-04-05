-- Monetization schema additions
-- Adds subscription tiers, embedding quotas, paid packs, cloud sync

-- ============================================
-- PROFILES ADDITIONS (subscription management)
-- ============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON public.profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe ON public.profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ============================================
-- PACKS ADDITIONS (embedding status, paid packs)
-- ============================================
ALTER TABLE public.packs
ADD COLUMN IF NOT EXISTS is_embedded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS price_cents INTEGER DEFAULT 0 CHECK (price_cents >= 0),
ADD COLUMN IF NOT EXISTS preview_decisions INTEGER DEFAULT 3 CHECK (preview_decisions >= 0);

CREATE INDEX IF NOT EXISTS idx_packs_embedded ON public.packs(is_embedded);
CREATE INDEX IF NOT EXISTS idx_packs_paid ON public.packs(is_paid) WHERE is_paid = true;

-- ============================================
-- EMBEDDING PUBLISHES (weekly quota tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS public.embedding_publishes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    pack_id UUID REFERENCES public.packs(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.embedding_publishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own embedding publishes" 
ON public.embedding_publishes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create embedding publishes" 
ON public.embedding_publishes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_embedding_publishes_user ON public.embedding_publishes(user_id);
CREATE INDEX IF NOT EXISTS idx_embedding_publishes_created ON public.embedding_publishes(created_at DESC);

-- Function to count weekly embedding publishes for a user
CREATE OR REPLACE FUNCTION public.get_weekly_embedding_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.embedding_publishes
        WHERE user_id = p_user_id
        AND created_at > NOW() - INTERVAL '7 days'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PACK PURCHASES (revenue tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS public.pack_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    pack_id UUID REFERENCES public.packs(id) ON DELETE SET NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    platform_fee_cents INTEGER NOT NULL CHECK (platform_fee_cents >= 0),
    creator_amount_cents INTEGER NOT NULL CHECK (creator_amount_cents >= 0),
    stripe_payment_id TEXT UNIQUE,
    stripe_checkout_session_id TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pack_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases" 
ON public.pack_purchases FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Pack authors can view their pack purchases" 
ON public.pack_purchases FOR SELECT 
USING (
    pack_id IN (SELECT id FROM public.packs WHERE author_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_pack_purchases_user ON public.pack_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_pack_purchases_pack ON public.pack_purchases(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_purchases_stripe ON public.pack_purchases(stripe_payment_id);

-- Function to check if user owns a pack
CREATE OR REPLACE FUNCTION public.user_owns_pack(p_user_id UUID, p_pack_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is the author
    IF EXISTS (SELECT 1 FROM public.packs WHERE id = p_pack_id AND author_id = p_user_id) THEN
        RETURN true;
    END IF;
    
    -- Check if pack is free
    IF EXISTS (SELECT 1 FROM public.packs WHERE id = p_pack_id AND (is_paid = false OR price_cents = 0)) THEN
        RETURN true;
    END IF;
    
    -- Check if user purchased the pack
    RETURN EXISTS (
        SELECT 1 FROM public.pack_purchases 
        WHERE user_id = p_user_id 
        AND pack_id = p_pack_id 
        AND status = 'completed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- USER DECISIONS (cloud sync)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_decisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    project_name TEXT NOT NULL,
    decision_id TEXT NOT NULL, -- The local decision ID (e.g., "ui-001")
    scope TEXT NOT NULL,
    decision TEXT NOT NULL,
    rationale TEXT,
    applies_to TEXT[],
    constraints TEXT[],
    tags TEXT[],
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'overridden')),
    embedding vector(768), -- Gemini embedding dimension
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, project_name, decision_id)
);

ALTER TABLE public.user_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own decisions" 
ON public.user_decisions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own decisions" 
ON public.user_decisions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own decisions" 
ON public.user_decisions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own decisions" 
ON public.user_decisions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_decisions_user ON public.user_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_decisions_project ON public.user_decisions(user_id, project_name);
CREATE INDEX IF NOT EXISTS idx_user_decisions_scope ON public.user_decisions(scope);

-- Create vector similarity search index (for semantic search)
CREATE INDEX IF NOT EXISTS idx_user_decisions_embedding ON public.user_decisions 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Function to find similar decisions using vector search
CREATE OR REPLACE FUNCTION public.search_user_decisions(
    p_user_id UUID,
    p_project_name TEXT,
    p_query_embedding vector(768),
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    decision_id TEXT,
    scope TEXT,
    decision TEXT,
    rationale TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ud.id,
        ud.decision_id,
        ud.scope,
        ud.decision,
        ud.rationale,
        1 - (ud.embedding <=> p_query_embedding) as similarity
    FROM public.user_decisions ud
    WHERE ud.user_id = p_user_id
    AND ud.project_name = p_project_name
    AND ud.status = 'active'
    AND ud.embedding IS NOT NULL
    ORDER BY ud.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE PACKS_WITH_RATINGS VIEW
-- Must DROP and recreate to add new columns from packs table
-- ============================================
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

