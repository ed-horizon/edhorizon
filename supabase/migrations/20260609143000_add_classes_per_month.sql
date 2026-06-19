-- Add classes_per_month column to student_details
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS classes_per_month INTEGER DEFAULT 0;
