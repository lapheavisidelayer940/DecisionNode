-- Add Stripe status caching columns to profiles table
-- This reduces expensive Stripe API calls by caching account status

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_account_status TEXT CHECK (stripe_account_status IN ('active', 'incomplete', 'pending', 'not_connected')),
ADD COLUMN IF NOT EXISTS stripe_status_checked_at TIMESTAMPTZ;

-- Add index for efficient cache expiry checks
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_status_checked 
ON profiles(stripe_status_checked_at) 
WHERE stripe_connect_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN profiles.stripe_account_status IS 'Cached Stripe Connect account status (active/incomplete/pending/not_connected)';
COMMENT ON COLUMN profiles.stripe_status_checked_at IS 'Last time Stripe account status was verified via API';
