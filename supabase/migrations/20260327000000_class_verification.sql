-- Add verification status directly to live classes for payroll purposes
ALTER TABLE public.live_classes 
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id);
