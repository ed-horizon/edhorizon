
-- Add hourly_rate to staff_details
ALTER TABLE public.staff_details 
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(12, 2) DEFAULT 0;

-- Add duration_hours to live_classes
ALTER TABLE public.live_classes 
ADD COLUMN IF NOT EXISTS duration_hours NUMERIC(4, 2) DEFAULT 1.0;
