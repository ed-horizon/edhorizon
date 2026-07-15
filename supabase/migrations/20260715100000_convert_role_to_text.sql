-- Migration: Convert profiles.role to text
-- Convert the profiles.role column from the rigid enum type to text to support custom roles,
-- and update the new user creation trigger accordingly.

-- 1. Alter profiles.role column type to text dynamically by backing up and restoring any user-defined triggers and RLS policies in the database
DO $$
DECLARE
    r RECORD;
    trigger_defs text[] := '{}';
    trigger_names text[] := '{}';
    policy_defs text[] := '{}';
    policy_names text[] := '{}';
    policy_tables text[] := '{}';
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

    -- Fetch definitions, names, and tables of all RLS policies
    FOR r IN 
        SELECT 
            n.nspname || '.' || c.relname AS full_table_name,
            p.polname,
            pg_get_policydef(p.oid) AS def
        FROM pg_policy p
        JOIN pg_class c ON c.oid = p.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
    LOOP
        policy_defs := array_append(policy_defs, r.def);
        policy_names := array_append(policy_names, r.polname);
        policy_tables := array_append(policy_tables, r.full_table_name);
    END LOOP;

    -- Drop all the triggers to free column alterations
    IF array_length(trigger_names, 1) > 0 THEN
        FOR i IN 1..array_length(trigger_names, 1) LOOP
            EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trigger_names[i]) || ' ON public.profiles';
        END LOOP;
    END IF;

    -- Drop all RLS policies
    IF array_length(policy_names, 1) > 0 THEN
        FOR i IN 1..array_length(policy_names, 1) LOOP
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_names[i]) || ' ON ' || policy_tables[i];
        END LOOP;
    END IF;

    -- Alter column type to text
    EXECUTE 'ALTER TABLE public.profiles ALTER COLUMN role TYPE text';

    -- Recreate all RLS policies
    IF array_length(policy_defs, 1) > 0 THEN
        FOR i IN 1..array_length(policy_defs, 1) LOOP
            EXECUTE policy_defs[i];
        END LOOP;
    END IF;

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
