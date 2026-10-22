-- Migration: Add course duration in days to batches, and enable fresh batch-specific learning content

-- 1. Add course_duration_days to batches
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS course_duration_days INTEGER;

-- 2. Modify batch_learning_content to support fresh custom batch materials
ALTER TABLE public.batch_learning_content ALTER COLUMN capsule_id DROP NOT NULL;
ALTER TABLE public.batch_learning_content DROP CONSTRAINT IF EXISTS batch_capsule_unique;

ALTER TABLE public.batch_learning_content ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.batch_learning_content ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'document';
ALTER TABLE public.batch_learning_content ADD COLUMN IF NOT EXISTS content_url TEXT;
ALTER TABLE public.batch_learning_content ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.batch_learning_content ADD COLUMN IF NOT EXISTS source_batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL;
ALTER TABLE public.batch_learning_content ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS batch_learning_content_source_idx ON public.batch_learning_content(source_batch_id);
