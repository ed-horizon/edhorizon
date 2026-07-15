-- Migration: Convert profiles.role to text
-- Convert the profiles.role column from the rigid enum type to text to support custom roles,
-- and update the new user creation trigger accordingly.

-- 1. Alter profiles.role column type to text
ALTER TABLE public.profiles ALTER COLUMN role TYPE text;

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
