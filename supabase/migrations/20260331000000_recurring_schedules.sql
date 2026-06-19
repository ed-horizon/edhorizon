-- 1. Create Class Schedules Master Table
CREATE TABLE IF NOT EXISTS public.class_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    meeting_link TEXT NOT NULL,
    pattern_days INTEGER[] NOT NULL, -- Array of 0-6 (Sun-Sat)
    time_of_day TIME NOT NULL,       -- HH:MM:SS
    duration_hours NUMERIC(4,2) DEFAULT 1.0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Link Live Classes to the Parent Schedule
ALTER TABLE public.live_classes 
ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES public.class_schedules(id) ON DELETE CASCADE;

-- 3. RLS Policies
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

-- Everyone can see active schedules connecting them
CREATE POLICY "Public can view class schedules"
  ON public.class_schedules FOR SELECT
  USING (true);

-- Teachers and Admins can manage
CREATE POLICY "Teachers and Admins manage class schedules"
  ON public.class_schedules FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'super_admin', 'hr')));
