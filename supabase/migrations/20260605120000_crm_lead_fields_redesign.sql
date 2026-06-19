-- Migration: Add detailed CRM tracking columns to public.leads table
-- This supports the new Sales Head and Salesperson workflows.

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS parent_name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_source text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS required_course text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS call_status text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lost_reason text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_follow_up timestamp with time zone;

-- Optional: Seed/Update a few leads with realistic sample values for demonstration
UPDATE public.leads 
SET 
  parent_name = 'Rajesh Sharma', 
  lead_source = 'Meta ad', 
  required_course = 'Spoken Hindi', 
  call_status = 'Connected', 
  next_follow_up = now() + interval '1 day'
WHERE name = 'Aarav Sharma' OR name LIKE 'Aarav%';

UPDATE public.leads 
SET 
  parent_name = 'Neha Patel', 
  lead_source = 'WhatsApp', 
  required_course = 'School Hindi', 
  call_status = 'Busy', 
  next_follow_up = now() + interval '2 days'
WHERE name = 'Priya Patel' OR name LIKE 'Priya%';
