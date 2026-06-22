-- Add tutor_joined_late column directly to live classes for tracking late joinings
ALTER TABLE public.live_classes 
ADD COLUMN IF NOT EXISTS tutor_joined_late BOOLEAN DEFAULT FALSE;

-- Retroactively update completed classes where the tutor joined late (> 5 minutes scheduled start time)
UPDATE public.live_classes 
SET tutor_joined_late = TRUE 
WHERE tutor_joined_at IS NOT NULL 
  AND (tutor_joined_at - scheduled_at) > INTERVAL '5 minutes';

-- Reload the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
