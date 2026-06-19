-- Add employee_id column to staff_details table
ALTER TABLE public.staff_details ADD COLUMN IF NOT EXISTS employee_id TEXT DEFAULT NULL;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
