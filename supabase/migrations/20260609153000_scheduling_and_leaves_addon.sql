-- 1. Add day_timings column to class_schedules
ALTER TABLE public.class_schedules ADD COLUMN IF NOT EXISTS day_timings JSONB;

-- 2. Create student_leaves table
CREATE TABLE IF NOT EXISTS public.student_leaves (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.student_leaves ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for student_leaves
DROP POLICY IF EXISTS "Users can view student_leaves associated with them" ON public.student_leaves;
CREATE POLICY "Users can view student_leaves associated with them"
    ON public.student_leaves FOR SELECT
    USING (auth.uid() = student_id OR auth.uid() = teacher_id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'hr', 'operations')
    ));

DROP POLICY IF EXISTS "Students can create own student_leaves" ON public.student_leaves;
CREATE POLICY "Students can create own student_leaves"
    ON public.student_leaves FOR INSERT
    WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers and Admins can update student_leaves" ON public.student_leaves;
CREATE POLICY "Teachers and Admins can update student_leaves"
    ON public.student_leaves FOR UPDATE
    USING (auth.uid() = teacher_id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'hr', 'operations')
    ));
