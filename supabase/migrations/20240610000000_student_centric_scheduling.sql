
-- 1. Update student_details for 1:1 scheduling
ALTER TABLE public.student_details 
ADD COLUMN IF NOT EXISTS assigned_teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS preferred_meeting_link TEXT,
ADD COLUMN IF NOT EXISTS preferred_time TEXT;

-- 2. Update live_classes for 1:1 scheduling
ALTER TABLE public.live_classes 
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Policy Update: Teachers should only manage classes for their assigned students
-- (Existing policy is already quite permissive, but we'll refine it in code)
