-- Drop the old staff_details status check constraint and recreate it to support the 'locked' status
ALTER TABLE public.staff_details DROP CONSTRAINT IF EXISTS staff_details_status_check;

ALTER TABLE public.staff_details ADD CONSTRAINT staff_details_status_check CHECK (status IN ('active', 'inactive', 'locked'));

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
