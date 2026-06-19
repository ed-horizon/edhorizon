-- Add deductions support to the hourly payroll items
ALTER TABLE public.payroll_items
ADD COLUMN IF NOT EXISTS deductions NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deduction_reason TEXT;
