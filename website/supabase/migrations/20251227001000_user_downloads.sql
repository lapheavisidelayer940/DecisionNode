-- User downloads tracking table (one download per user per pack)
CREATE TABLE IF NOT EXISTS public.user_downloads (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    pack_id UUID REFERENCES public.packs(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, pack_id)
);

ALTER TABLE public.user_downloads ENABLE ROW LEVEL SECURITY;

-- Users can view their own downloads
CREATE POLICY "Users can view own downloads" ON public.user_downloads 
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own downloads    
CREATE POLICY "Users can insert own downloads" ON public.user_downloads 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drop old function and recreate with user tracking
DROP FUNCTION IF EXISTS public.increment_downloads(TEXT);

-- New increment_downloads function that tracks per-user downloads
-- Returns TRUE if this is a new download, FALSE if already downloaded
CREATE OR REPLACE FUNCTION public.increment_downloads(pack_slug TEXT, downloader_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    target_pack_id UUID;
    already_downloaded BOOLEAN := FALSE;
BEGIN
    -- Get the pack ID
    SELECT id INTO target_pack_id FROM public.packs WHERE slug = pack_slug;
    
    IF target_pack_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- If no user ID provided (anonymous), always increment
    IF downloader_id IS NULL THEN
        UPDATE public.packs SET downloads = downloads + 1 WHERE id = target_pack_id;
        RETURN TRUE;
    END IF;
    
    -- Check if user already downloaded this pack
    SELECT EXISTS(
        SELECT 1 FROM public.user_downloads 
        WHERE user_id = downloader_id AND pack_id = target_pack_id
    ) INTO already_downloaded;
    
    IF already_downloaded THEN
        -- User already downloaded, don't increment
        RETURN FALSE;
    END IF;
    
    -- New download: record it and increment counter
    INSERT INTO public.user_downloads (user_id, pack_id) 
    VALUES (downloader_id, target_pack_id)
    ON CONFLICT (user_id, pack_id) DO NOTHING;
    
    UPDATE public.packs SET downloads = downloads + 1 WHERE id = target_pack_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_downloads_user ON public.user_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_downloads_pack ON public.user_downloads(pack_id);
