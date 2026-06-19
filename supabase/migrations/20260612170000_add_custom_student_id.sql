-- Add custom_student_id column to student_details table
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS custom_student_id TEXT DEFAULT NULL;
