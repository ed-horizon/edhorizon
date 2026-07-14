-- Migration: HR, Payroll, Payments & Scheduler Updates
-- Target: Supabase dev/prod schema updates

-- 1. Convert profiles.role to text type to allow custom roles
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN role TYPE text USING role::text;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'student';

-- 2. Update handle_new_user trigger function to avoid enum casting
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- 3. Add pay_basis column to staff_details
ALTER TABLE public.staff_details ADD COLUMN IF NOT EXISTS pay_basis TEXT DEFAULT 'hourly';

-- Existing staff records predate pay_basis. Preserve fixed-salary payroll for
-- rows that have a basic salary and no hourly rate instead of silently
-- treating every existing employee as hourly.
UPDATE public.staff_details
SET pay_basis = 'fixed'
WHERE COALESCE(basic_salary, 0) > 0
  AND COALESCE(hourly_rate, 0) = 0;

ALTER TABLE public.staff_details DROP CONSTRAINT IF EXISTS staff_details_pay_basis_check;
ALTER TABLE public.staff_details ADD CONSTRAINT staff_details_pay_basis_check CHECK (pay_basis IN ('hourly', 'fixed'));

-- 4. Add subject_name and receipt_date columns to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS subject_name TEXT DEFAULT 'Hindi';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS receipt_date DATE DEFAULT NULL;
