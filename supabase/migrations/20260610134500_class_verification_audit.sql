-- Add check-in audit and parent cross-signoff columns to live_classes
ALTER TABLE public.live_classes 
ADD COLUMN IF NOT EXISTS tutor_joined_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS student_joined_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parent_verified BOOLEAN DEFAULT NULL, -- NULL = pending, TRUE = verified, FALSE = disputed
ADD COLUMN IF NOT EXISTS parent_dispute_reason TEXT DEFAULT NULL;
