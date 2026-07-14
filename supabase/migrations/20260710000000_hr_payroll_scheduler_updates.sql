-- Migration: HR, Payroll, Payments & Scheduler Updates
-- Target: Supabase dev/prod schema updates

-- Keep profiles.role on the supported user_role enum. Arbitrary authorization
-- roles require a separate expand/contract design because this column is used
-- by RLS policies, security functions, and profile triggers.

-- 1. Add pay_basis column to staff_details
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

-- 2. Add subject_name and receipt_date columns to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS subject_name TEXT DEFAULT 'Hindi';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS receipt_date DATE DEFAULT NULL;
