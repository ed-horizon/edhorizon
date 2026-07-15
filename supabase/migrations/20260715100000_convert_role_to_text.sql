-- Migration: Convert profiles.role to text
-- Convert the profiles.role column from the rigid enum type to text to support custom roles,
-- and update the new user creation trigger accordingly.

-- 1. Alter profiles.role column type to text dynamically by backing up and restoring any dependent trigger
DO $$
DECLARE
    trigger_def text;
BEGIN
    -- Get the exact trigger definition of any dependent trigger on profiles.role
    SELECT pg_get_triggerdef(oid)
    INTO trigger_def
    FROM pg_trigger
    WHERE tgname = 'on_profile_staff_details'
      AND tgrelid = 'public.profiles'::regclass;

    -- If it exists, drop it, alter the column type, and recreate it exactly as it was
    IF trigger_def IS NOT NULL THEN
        EXECUTE 'DROP TRIGGER IF EXISTS on_profile_staff_details ON public.profiles';
        EXECUTE 'ALTER TABLE public.profiles ALTER COLUMN role TYPE text';
        EXECUTE trigger_def;
    ELSE
        -- If trigger doesn't exist, just alter the column directly
        EXECUTE 'ALTER TABLE public.profiles ALTER COLUMN role TYPE text';
    END IF;
END $$;

-- 2. Update the handle_new_user trigger function to insert the role string directly without casting
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'student')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
