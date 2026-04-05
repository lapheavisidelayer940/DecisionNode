-- Fix username collision handling by appending numbers when duplicates occur
-- E.g., johndoe -> johndoe2 -> johndoe3 etc.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    base_username TEXT;
    final_username TEXT;
    counter INT := 1;
BEGIN
    -- Generate base username: Use user_name/name/email, replace spaces with underscores, and lowercase it
    base_username := LOWER(REPLACE(
        COALESCE(
            NEW.raw_user_meta_data->>'user_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        ),
        ' ', '_'
    ));
    
    -- Remove any non-alphanumeric characters except underscore
    base_username := REGEXP_REPLACE(base_username, '[^a-z0-9_]', '', 'g');
    
    -- Start with base username
    final_username := base_username;
    
    -- Check for collision and append number if needed
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
        counter := counter + 1;
        final_username := base_username || counter::TEXT;
    END LOOP;
    
    -- Insert profile with unique username
    INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (
        NEW.id,
        final_username,
        -- Display name can keep spaces
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        ),
        -- Avatar URL always NULL
        NULL
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile for new users with collision-safe username generation (appends numbers if duplicate)';
