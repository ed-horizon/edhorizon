-- Migration to support Multi-Subject Enrollment and optional Parent Email in onboarding
-- Execute this SQL script in the Supabase SQL Editor.

-- 1. Add optional columns to student_details table
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS parent_email TEXT DEFAULT NULL;
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS subject_name_1 TEXT DEFAULT 'Maths';
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS subject_name_2 TEXT DEFAULT NULL;
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS monthly_fee_2 NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS classes_per_month_2 INTEGER DEFAULT 0;
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS assigned_teacher_id_2 UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT NULL;
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS subject_name_3 TEXT DEFAULT NULL;
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS monthly_fee_3 NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS classes_per_month_3 INTEGER DEFAULT 0;
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS assigned_teacher_id_3 UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT NULL;

-- 2. Create class_reminders_log table
CREATE TABLE IF NOT EXISTS public.class_reminders_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES public.live_classes(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_role TEXT NOT NULL, -- 'parent' or 'teacher'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent',
  subject TEXT NOT NULL,
  body TEXT NOT NULL
);

-- Enable RLS on class_reminders_log
ALTER TABLE public.class_reminders_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select logs for audit
CREATE POLICY "Allow authenticated users to read logs" ON public.class_reminders_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role / admin client to manage logs
CREATE POLICY "Allow admin to manage logs" ON public.class_reminders_log
  FOR ALL USING (true);
