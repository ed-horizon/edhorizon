-- Migration: Add attempt tracking, best score, and attempt history to quiz_completions
ALTER TABLE public.quiz_completions
ADD COLUMN IF NOT EXISTS attempts_count INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS best_score INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS attempt_history JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill existing rows: best_score = score, attempts_count = 1, attempt_history initialized
UPDATE public.quiz_completions
SET 
  best_score = COALESCE(score, 0),
  attempts_count = COALESCE(attempts_count, 1),
  attempt_history = CASE 
    WHEN attempt_history = '[]'::jsonb AND score IS NOT NULL THEN 
      jsonb_build_array(jsonb_build_object('attempt', 1, 'score', score, 'total_questions', total_questions, 'completed_at', completed_at))
    ELSE attempt_history 
  END
WHERE best_score = 0 AND score > 0;
