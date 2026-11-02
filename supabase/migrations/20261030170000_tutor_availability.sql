-- 1. Create Tutor Availability Table for tracking weekly availability slots (05:00 to 22:00)
CREATE TABLE IF NOT EXISTS public.tutor_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, ..., 6=Saturday
    time_slot TEXT NOT NULL,                                           -- '05:00' to '22:00'
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'unavailable')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT tutor_availability_teacher_day_slot_unique UNIQUE (teacher_id, day_of_week, time_slot)
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_tutor_availability_teacher ON public.tutor_availability(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tutor_availability_lookup ON public.tutor_availability(teacher_id, day_of_week, time_slot);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.tutor_availability ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tutor_availability TO authenticated;

-- 3. RLS Policies
-- SELECT: Tutors can view only their own records; Staff (admin, super_admin, hr, operations, sales, sales_head) can view all
DROP POLICY IF EXISTS "Tutors can view own availability and staff can view all" ON public.tutor_availability;
CREATE POLICY "Tutors can view own availability and staff can view all"
    ON public.tutor_availability FOR SELECT
    USING (
        auth.uid() = teacher_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
              AND role IN ('admin', 'super_admin', 'hr', 'operations', 'sales', 'sales_head')
        )
    );

-- INSERT: Tutors can insert only their own availability; Admins/HR/Operations can manage
DROP POLICY IF EXISTS "Tutors can insert own availability" ON public.tutor_availability;
CREATE POLICY "Tutors can insert own availability"
    ON public.tutor_availability FOR INSERT
    WITH CHECK (
        auth.uid() = teacher_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
              AND role IN ('admin', 'super_admin', 'hr', 'operations')
        )
    );

-- UPDATE: Tutors can update only their own availability; Admins/HR/Operations can manage
DROP POLICY IF EXISTS "Tutors can update own availability" ON public.tutor_availability;
CREATE POLICY "Tutors can update own availability"
    ON public.tutor_availability FOR UPDATE
    USING (
        auth.uid() = teacher_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
              AND role IN ('admin', 'super_admin', 'hr', 'operations')
        )
    )
    WITH CHECK (
        auth.uid() = teacher_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
              AND role IN ('admin', 'super_admin', 'hr', 'operations')
        )
    );

-- DELETE: Tutors can delete only their own availability; Admins/HR/Operations can manage
DROP POLICY IF EXISTS "Tutors can delete own availability" ON public.tutor_availability;
CREATE POLICY "Tutors can delete own availability"
    ON public.tutor_availability FOR DELETE
    USING (
        auth.uid() = teacher_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
              AND role IN ('admin', 'super_admin', 'hr', 'operations')
        )
    );
