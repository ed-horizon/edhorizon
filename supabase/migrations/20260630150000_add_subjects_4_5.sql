-- Add optional columns for Subject 4 and Subject 5 to student_details table
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS subject_name_4 TEXT DEFAULT NULL;
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS monthly_fee_4 NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS classes_per_month_4 INTEGER DEFAULT 0;
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS assigned_teacher_id_4 UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT NULL;

ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS subject_name_5 TEXT DEFAULT NULL;
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS monthly_fee_5 NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS classes_per_month_5 INTEGER DEFAULT 0;
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS assigned_teacher_id_5 UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT NULL;
