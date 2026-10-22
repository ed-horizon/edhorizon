-- Migration: Batch Classes UX Enhancements
-- 1. Make schedule_description optional on batches
ALTER TABLE public.batches ALTER COLUMN schedule_description DROP NOT NULL;

-- 2. Make title optional on batch_sessions (defaults to 'Session')
ALTER TABLE public.batch_sessions ALTER COLUMN title DROP NOT NULL;
ALTER TABLE public.batch_sessions ALTER COLUMN title SET DEFAULT 'Session';

-- 3. Add recurring_days and session_time columns to batches for structured scheduling
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS recurring_days TEXT[]; -- e.g. ARRAY['Mon', 'Wed', 'Fri']
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS session_time TIME;      -- e.g. '18:00:00'
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS session_duration_minutes INTEGER DEFAULT 60;
