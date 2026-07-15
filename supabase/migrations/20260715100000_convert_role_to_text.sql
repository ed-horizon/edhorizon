-- Migration: Convert profiles.role to text
-- Convert the profiles.role column from the rigid enum type to text to support custom roles,
-- and update the new user creation trigger accordingly.

-- 1. Alter profiles.role column type to text dynamically by backing up and restoring any user-defined triggers on the table
DO $$
DECLARE
    r RECORD;
    trigger_defs text[] := '{}';
    trigger_names text[] := '{}';
    i int;
BEGIN
    -- Fetch definitions and names of all user triggers on profiles table
    FOR r IN 
        SELECT tgname, pg_get_triggerdef(oid) AS def
        FROM pg_trigger
        WHERE tgrelid = 'public.profiles'::regclass
          AND NOT tgisinternal
    LOOP
        trigger_defs := array_append(trigger_defs, r.def);
        trigger_names := array_append(trigger_names, r.tgname);
    END LOOP;

    -- Drop all the triggers to free column alterations
    IF array_length(trigger_names, 1) > 0 THEN
        FOR i IN 1..array_length(trigger_names, 1) LOOP
            EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trigger_names[i]) || ' ON public.profiles';
        END LOOP;
    END IF;

    -- Alter column type to text
    EXECUTE 'ALTER TABLE public.profiles ALTER COLUMN role TYPE text';

    -- Recreate all of the triggers exactly as they were
    IF array_length(trigger_defs, 1) > 0 THEN
        FOR i IN 1..array_length(trigger_defs, 1) LOOP
            EXECUTE trigger_defs[i];
        END LOOP;
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
