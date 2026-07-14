-- Add is_onboarded flag to public.leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_onboarded boolean DEFAULT false;
