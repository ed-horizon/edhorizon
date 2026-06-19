-- Migration: Teacher Portal Redesign & Post-Class Reporting

-- 1. Add post-class logging columns to live_classes
ALTER TABLE public.live_classes 
ADD COLUMN IF NOT EXISTS topic_taught TEXT,
ADD COLUMN IF NOT EXISTS homework_given TEXT,
ADD COLUMN IF NOT EXISTS student_performance TEXT CHECK (student_performance IN ('Good', 'Average', 'Needs Improvement')),
ADD COLUMN IF NOT EXISTS parent_note TEXT;

-- 2. Create student_materials table for shared worksheets/materials
CREATE TABLE IF NOT EXISTS public.student_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.student_materials ENABLE ROW LEVEL SECURITY;

-- Policies for student_materials
CREATE POLICY "Users can view student_materials associated with them"
    ON public.student_materials FOR SELECT
    USING (auth.uid() = student_id OR auth.uid() = teacher_id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'hr')
    ));

CREATE POLICY "Teachers and Admins can manage student_materials"
    ON public.student_materials FOR ALL
    USING (auth.uid() = teacher_id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ));

-- 3. Create homework_assignments table
CREATE TABLE IF NOT EXISTS public.homework_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    status TEXT CHECK (status IN ('assigned', 'submitted', 'completed')) DEFAULT 'assigned',
    submission_url TEXT,
    submission_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.homework_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for homework_assignments
CREATE POLICY "Users can view homework_assignments associated with them"
    ON public.homework_assignments FOR SELECT
    USING (auth.uid() = student_id OR auth.uid() = teacher_id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'hr')
    ));

CREATE POLICY "Teachers and Admins can manage homework_assignments"
    ON public.homework_assignments FOR ALL
    USING (auth.uid() = teacher_id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ));

-- 4. Create reschedule_requests table
CREATE TABLE IF NOT EXISTS public.reschedule_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID REFERENCES public.live_classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    requested_date DATE NOT NULL,
    requested_time TIME NOT NULL,
    reason TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reschedule_requests ENABLE ROW LEVEL SECURITY;

-- Policies for reschedule_requests
CREATE POLICY "Users can view reschedule_requests associated with them"
    ON public.reschedule_requests FOR SELECT
    USING (auth.uid() = student_id OR auth.uid() = teacher_id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'hr')
    ));

CREATE POLICY "Teachers, Students, and Admins can create reschedule_requests"
    ON public.reschedule_requests FOR INSERT
    WITH CHECK (auth.uid() = teacher_id OR auth.uid() = student_id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ));

CREATE POLICY "Teachers and Admins can update reschedule_requests"
    ON public.reschedule_requests FOR UPDATE
    USING (auth.uid() = teacher_id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'hr')
    ));

-- 5. Add homework submission columns for existing tables
ALTER TABLE public.homework_assignments ADD COLUMN IF NOT EXISTS submission_url TEXT;
ALTER TABLE public.homework_assignments ADD COLUMN IF NOT EXISTS submission_notes TEXT;
