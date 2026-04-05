-- ============================================
-- FIX EMBEDDING DIMENSIONS (768 -> 3072)
-- ============================================

-- 1. Drop the index first (it depends on the column type)
DROP INDEX IF EXISTS idx_user_decisions_embedding;

-- 2. Resize the vector column to 3072
ALTER TABLE public.user_decisions 
ALTER COLUMN embedding TYPE vector(3072);

-- 3. (SKIPPED) Index creation
-- Note: 3072 dimensions (12KB) exceeds the Postgres page size limit (8KB) for index tuples.
-- We cannot index this column with standard IVFFlat/HNSW. 
-- Search will use exact nearest neighbor (sequential scan), which is fine for <100k records.

-- 4. Update the search function to accept 3072 dimensions
-- First drop the old overload to avoid confusion
DROP FUNCTION IF EXISTS public.search_user_decisions(UUID, TEXT, vector(768), INTEGER);

CREATE OR REPLACE FUNCTION public.search_user_decisions(
    p_user_id UUID,
    p_project_name TEXT,
    p_query_embedding vector(3072),
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
    AND (p_project_name IS NULL OR ud.project_name = p_project_name)
    ORDER BY ud.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
