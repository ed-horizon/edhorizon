-- Add bonus and is_approved columns to payroll_items
ALTER TABLE public.payroll_items
ADD COLUMN IF NOT EXISTS bonus NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
