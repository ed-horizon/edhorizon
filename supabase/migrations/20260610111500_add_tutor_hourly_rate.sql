-- Add tutor_hourly_rate to student_details to allow student-specific tutor rates
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS tutor_hourly_rate NUMERIC DEFAULT NULL;
