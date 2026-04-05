-- Security & Abuse Prevention Migration
-- Implements: Piracy Prevention, Content Moderation, Rate Limiting

-- ============================================
-- 1. PIRACY PREVENTION
-- ============================================

-- Add content hash for duplicate detection
ALTER TABLE packs ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Add watermark field (stores buyer info for downloads)
ALTER TABLE packs ADD COLUMN IF NOT EXISTS allow_watermark BOOLEAN DEFAULT TRUE;

-- Index for fast duplicate lookups
CREATE INDEX IF NOT EXISTS idx_packs_content_hash ON packs(content_hash) WHERE content_hash IS NOT NULL;

-- Function to generate content hash from decisions
CREATE OR REPLACE FUNCTION generate_content_hash(decisions JSONB)
RETURNS TEXT AS $$
  SELECT md5(decisions::text);
$$ LANGUAGE sql IMMUTABLE;

-- Function to check for duplicate content (different author)
CREATE OR REPLACE FUNCTION check_duplicate_content(new_hash TEXT, author_id UUID)
RETURNS TABLE(is_duplicate BOOLEAN, original_pack_id UUID, original_author TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE,
    p.id,
    pr.username
  FROM packs p
  JOIN profiles pr ON p.author_id = pr.id
  WHERE p.content_hash = new_hash 
  AND p.author_id != check_duplicate_content.author_id
  LIMIT 1;
  
  -- If no duplicate found, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate hash on insert/update
CREATE OR REPLACE FUNCTION update_content_hash()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_hash := generate_content_hash(NEW.decisions);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_content_hash ON packs;
CREATE TRIGGER trigger_update_content_hash
  BEFORE INSERT OR UPDATE OF decisions ON packs
  FOR EACH ROW
  EXECUTE FUNCTION update_content_hash();

-- ============================================
-- 2. CONTENT MODERATION
-- ============================================

-- Blocklist table for prohibited words
CREATE TABLE IF NOT EXISTS content_blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT UNIQUE NOT NULL,
  severity TEXT DEFAULT 'block' CHECK (severity IN ('block', 'review')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial blocklist (common inappropriate terms)
INSERT INTO content_blocklist (word, severity) VALUES
  ('porn', 'block'),
  ('xxx', 'block'),
  ('nude', 'block'),
  ('nsfw', 'block'),
  ('sex', 'review'),
  ('adult', 'review')
ON CONFLICT (word) DO NOTHING;

-- Function to check content against blocklist
CREATE OR REPLACE FUNCTION contains_blocked_content(content TEXT)
RETURNS TABLE(is_blocked BOOLEAN, matched_word TEXT, severity TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE,
    cb.word,
    cb.severity
  FROM content_blocklist cb
  WHERE LOWER(content) LIKE '%' || LOWER(cb.word) || '%'
  AND cb.severity = 'block'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Content reports table (Instagram/Facebook style)
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID REFERENCES packs(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('inappropriate', 'piracy', 'spam', 'harassment', 'other')),
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate reports from same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_report ON content_reports(pack_id, reporter_id) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Policies for reports
CREATE POLICY "Users can create reports" ON content_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" ON content_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- ============================================
-- 3. RATE LIMITING
-- ============================================

-- Pack creation log for rate limiting
CREATE TABLE IF NOT EXISTS pack_creation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pack_id UUID REFERENCES packs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient rate checks
CREATE INDEX IF NOT EXISTS idx_pack_creation_user_time 
ON pack_creation_log(user_id, created_at DESC);

-- Function to check if user can create a pack
CREATE OR REPLACE FUNCTION can_create_pack(user_id UUID)
RETURNS TABLE(allowed BOOLEAN, reason TEXT, packs_remaining INT) AS $$
DECLARE
  packs_today INT;
  packs_week INT;
  daily_limit INT := 5;
  weekly_limit INT := 20;
BEGIN
  -- Count packs created in last 24 hours
  SELECT COUNT(*) INTO packs_today
  FROM pack_creation_log
  WHERE pack_creation_log.user_id = can_create_pack.user_id
  AND created_at > NOW() - INTERVAL '24 hours';
  
  IF packs_today >= daily_limit THEN
    RETURN QUERY SELECT FALSE, 'Daily limit reached (5 packs/day). Try again tomorrow.', 0;
    RETURN;
  END IF;
  
  -- Count packs created in last 7 days
  SELECT COUNT(*) INTO packs_week
  FROM pack_creation_log
  WHERE pack_creation_log.user_id = can_create_pack.user_id
  AND created_at > NOW() - INTERVAL '7 days';
  
  IF packs_week >= weekly_limit THEN
    RETURN QUERY SELECT FALSE, 'Weekly limit reached (20 packs/week).', 0;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT TRUE, 'OK', (daily_limit - packs_today);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log pack creation
CREATE OR REPLACE FUNCTION log_pack_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO pack_creation_log (user_id, pack_id)
  VALUES (NEW.author_id, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_pack_creation ON packs;
CREATE TRIGGER trigger_log_pack_creation
  AFTER INSERT ON packs
  FOR EACH ROW
  EXECUTE FUNCTION log_pack_creation();

-- ============================================
-- 4. ACCOUNT SECURITY (Soft limits via DB)
-- ============================================

-- Track login attempts (for visibility/analytics)
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  ip_address TEXT,
  success BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for rate limit checks
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip 
ON login_attempts(ip_address, created_at DESC);

-- Cleanup old records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM pack_creation_log WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE content_blocklist IS 'Words/phrases blocked from pack content';
COMMENT ON TABLE content_reports IS 'User-submitted reports for inappropriate content';
COMMENT ON TABLE pack_creation_log IS 'Tracks pack creation for rate limiting';
COMMENT ON FUNCTION can_create_pack IS 'Checks if user can create pack (5/day, 20/week limit)';
COMMENT ON FUNCTION check_duplicate_content IS 'Detects potential piracy by content hash matching';
