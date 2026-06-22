-- Drop NOT NULL constraint on teacher_id in student_materials
ALTER TABLE public.student_materials ALTER COLUMN teacher_id DROP NOT NULL;

-- Reload the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
