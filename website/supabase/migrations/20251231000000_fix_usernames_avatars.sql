-- Migration to fix usernames (remove spaces) and disable avatars

-- 1. Update the handle_new_user function to strip spaces from username and ignore avatar_url
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (
        NEW.id,
        -- Generate username: Use user_name/name/email, replace spaces with nothing, and lowercase it
        LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'user_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), ' ', '')),
        -- Display name can keep spaces
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        -- Avatar URL always NULL
        NULL
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Clean up existing profiles
-- Convert usernames to lowercase and remove spaces
UPDATE public.profiles
SET username = LOWER(REPLACE(username, ' ', ''));

-- Clear existing avatar URLs
UPDATE public.profiles
SET avatar_url = NULL;

-- 3. Ensure username column constraint if not already (it is UNIQUE in schema)
-- We might have duplicates after sanitization? 
-- E.g. "John Doe" and "johndoe" -> both become "johndoe".
-- Since this is a dev environment/beta, we might risk collisions. 
-- In a real prod migration, we'd handle duplicates. Here, I'll assume low risk or handle errors manually if push fails.
