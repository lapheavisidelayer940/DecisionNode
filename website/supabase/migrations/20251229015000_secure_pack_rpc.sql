-- Function to get secure pack details
-- Only returns full decisions/vectors if user owns the pack
-- Otherwise returns limited preview
CREATE OR REPLACE FUNCTION get_secure_pack_details(p_slug text)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  description text,
  scope text,
  author_id uuid,
  version text,
  decisions jsonb,
  vectors jsonb,
  tags text[],
  downloads bigint,
  is_featured boolean,
  is_published boolean,
  is_embedded boolean,
  is_paid boolean,
  price_cents integer,
  preview_decisions integer,
  created_at timestamptz,
  updated_at timestamptz,
  avg_rating numeric,
  rating_count bigint,
  author_username text,
  author_display_name text,
  author_avatar text,
  total_decisions_count integer,
  user_has_access boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pack Record;
  v_user_id uuid;
  v_has_access boolean;
  v_total_decisions integer;
  v_decisions jsonb;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  -- Get the pack
  SELECT * INTO v_pack
  FROM packs_with_ratings
  WHERE packs_with_ratings.slug = p_slug
  LIMIT 1;

  IF v_pack IS NULL THEN
    RETURN;
  END IF;

  -- Check access
  -- User has access if:
  -- 1. They are the author
  -- 2. The pack is free (not paid)
  -- 3. They have purchased the pack
  v_has_access := (
    v_pack.author_id = v_user_id OR 
    v_pack.is_paid = false OR 
    (
      v_user_id IS NOT NULL AND 
      EXISTS (
        SELECT 1 FROM pack_purchases 
        WHERE pack_purchases.pack_id = v_pack.id 
        AND pack_purchases.user_id = v_user_id 
        AND pack_purchases.status = 'completed'
      )
    )
  );

  -- Calculate total decisions count
  v_total_decisions := jsonb_array_length(v_pack.decisions);

  -- Process decisions based on access
  IF v_has_access THEN
    v_decisions := v_pack.decisions;
  ELSE
    -- Only return the first 'preview_decisions' elements
    -- We use a subquery to slice the JSON array
    SELECT jsonb_agg(elem) INTO v_decisions
    FROM (
      SELECT * FROM jsonb_array_elements(v_pack.decisions) 
      LIMIT COALESCE(v_pack.preview_decisions, 3)
    ) as elem;
    
    -- Handle case where preview count might be 0 or null result
    IF v_decisions IS NULL THEN
        v_decisions := '[]'::jsonb;
    END IF;
  END IF;

  RETURN QUERY
  SELECT 
    v_pack.id,
    v_pack.slug,
    v_pack.name,
    v_pack.description,
    v_pack.scope,
    v_pack.author_id,
    v_pack.version,
    v_decisions as decisions,
    CASE WHEN v_has_access THEN v_pack.vectors ELSE NULL END as vectors,
    v_pack.tags,
    v_pack.downloads::bigint,
    v_pack.is_featured,
    v_pack.is_published,
    v_pack.is_embedded,
    v_pack.is_paid,
    v_pack.price_cents,
    v_pack.preview_decisions,
    v_pack.created_at,
    v_pack.updated_at,
    v_pack.avg_rating,
    v_pack.rating_count::bigint,
    v_pack.author_username,
    v_pack.author_display_name,
    v_pack.author_avatar,
    v_total_decisions as total_decisions_count,
    v_has_access as user_has_access;
END;
$$;
