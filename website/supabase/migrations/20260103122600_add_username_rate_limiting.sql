-- Add username change tracking to enforce rate limits (Instagram-style: 2 changes per 14 days)

-- Add column to track username changes
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS username_change_count SMALLINT DEFAULT 0;

-- Add index for efficient rate limit checks
CREATE INDEX IF NOT EXISTS idx_profiles_username_changed
ON profiles(username_changed_at)
WHERE username_changed_at IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN profiles.username_changed_at IS 'Timestamp of last username change (for rate limiting)';
COMMENT ON COLUMN profiles.username_change_count IS 'Number of username changes in current 14-day window';

-- Create function to check if user can change username
CREATE OR REPLACE FUNCTION can_change_username(user_id UUID)
RETURNS TABLE(can_change BOOLEAN, reason TEXT, changes_remaining SMALLINT) AS $$
DECLARE
    last_changed TIMESTAMPTZ;
    change_count SMALLINT;
    days_since_change NUMERIC;
BEGIN
    SELECT username_changed_at, COALESCE(username_change_count, 0)
    INTO last_changed, change_count
    FROM profiles
    WHERE id = user_id;
    
    -- First time changing username
    IF last_changed IS NULL THEN
        RETURN QUERY SELECT TRUE, 'Can change username', 2::SMALLINT;
        RETURN;
    END IF;
    
    days_since_change := EXTRACT(EPOCH FROM (NOW() - last_changed)) / 86400;
    
    -- Reset counter if 14 days have passed
    IF days_since_change >= 14 THEN
        RETURN QUERY SELECT TRUE, 'Can change username', 2::SMALLINT;
        RETURN;
    END IF;
    
    -- Check if user has changes remaining
    IF change_count < 2 THEN
        RETURN QUERY SELECT TRUE, 'Can change username', (2 - change_count)::SMALLINT;
        RETURN;
    END IF;
    
    -- Rate limit exceeded
    RETURN QUERY SELECT 
        FALSE, 
        'You can only change your username twice every 14 days. Try again in ' || CEIL(14 - days_since_change)::TEXT || ' days.',
        0::SMALLINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_change_username IS 'Checks if user can change username (2 changes per 14 days limit)';
