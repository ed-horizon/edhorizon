-- ==============================================================================
-- Migration: Batch Classes System
-- Description: Adds isolated support for cohort-based batch classes, student enrollments,
--              session status tracking, batch learning content assignments, and one-time
--              course fees without impacting 1-on-1 attendance or payroll.
-- ==============================================================================

-- 1. Batches Table
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    course_name TEXT NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    capacity INTEGER NOT NULL DEFAULT 20 CHECK (capacity > 0),
    start_date DATE NOT NULL,
    end_date DATE,
    schedule_description TEXT NOT NULL,
    meeting_link TEXT,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
    agreed_tutor_payout NUMERIC(12, 2) DEFAULT 0 CHECK (agreed_tutor_payout >= 0),
    default_course_fee NUMERIC(12, 2) DEFAULT 0 CHECK (default_course_fee >= 0),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS batches_teacher_idx ON public.batches(teacher_id);
CREATE INDEX IF NOT EXISTS batches_status_idx ON public.batches(status);
CREATE INDEX IF NOT EXISTS batches_start_date_idx ON public.batches(start_date);

-- 2. Batch Enrollments Table (linking existing registered students)
CREATE TABLE IF NOT EXISTS public.batch_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    course_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (course_fee >= 0),
    fee_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (fee_status IN ('unpaid', 'paid', 'partially_paid', 'waived')),
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    payment_method TEXT DEFAULT 'other',
    transaction_id TEXT,
    fee_notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT batch_student_unique UNIQUE (batch_id, student_id)
);

CREATE INDEX IF NOT EXISTS batch_enrollments_batch_idx ON public.batch_enrollments(batch_id);
CREATE INDEX IF NOT EXISTS batch_enrollments_student_idx ON public.batch_enrollments(student_id);

-- 3. Batch Sessions Table (Tracking whether class was conducted - completely separate from 1-on-1 attendance)
CREATE TABLE IF NOT EXISTS public.batch_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
    session_number INTEGER,
    title TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60 CHECK (duration_minutes > 0),
    meeting_link TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'not_conducted', 'rescheduled', 'cancelled')),
    notes TEXT,
    completed_at TIMESTAMPTZ,
    conducted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS batch_sessions_batch_idx ON public.batch_sessions(batch_id);
CREATE INDEX IF NOT EXISTS batch_sessions_scheduled_idx ON public.batch_sessions(scheduled_at);

-- 4. Batch Learning Content (Assigning capsules from content library to batch)
CREATE TABLE IF NOT EXISTS public.batch_learning_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
    capsule_id UUID REFERENCES public.capsules(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT batch_capsule_unique UNIQUE (batch_id, capsule_id)
);

CREATE INDEX IF NOT EXISTS batch_learning_content_batch_idx ON public.batch_learning_content(batch_id);
CREATE INDEX IF NOT EXISTS batch_learning_content_capsule_idx ON public.batch_learning_content(capsule_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_learning_content ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies: public.batches
DROP POLICY IF EXISTS "Staff and participants view batches" ON public.batches;
CREATE POLICY "Staff and participants view batches"
    ON public.batches FOR SELECT
    TO authenticated
    USING (
        teacher_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.batch_enrollments AS be
            WHERE be.batch_id = public.batches.id AND be.student_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles AS profile
            WHERE profile.id = (SELECT auth.uid())
              AND profile.role::text IN ('super_admin', 'admin', 'operations', 'hr', 'sales', 'sales_head')
        )
    );

DROP POLICY IF EXISTS "Staff manage batches" ON public.batches;
CREATE POLICY "Staff manage batches"
    ON public.batches FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles AS profile
            WHERE profile.id = (SELECT auth.uid())
              AND profile.role::text IN ('super_admin', 'admin', 'operations')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles AS profile
            WHERE profile.id = (SELECT auth.uid())
              AND profile.role::text IN ('super_admin', 'admin', 'operations')
        )
    );

-- 7. RLS Policies: public.batch_enrollments
DROP POLICY IF EXISTS "Staff and enrolled students view enrollments" ON public.batch_enrollments;
CREATE POLICY "Staff and enrolled students view enrollments"
    ON public.batch_enrollments FOR SELECT
    TO authenticated
    USING (
        student_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.batches AS b
            WHERE b.id = public.batch_enrollments.batch_id AND b.teacher_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles AS profile
            WHERE profile.id = (SELECT auth.uid())
              AND profile.role::text IN ('super_admin', 'admin', 'operations', 'hr')
        )
    );

DROP POLICY IF EXISTS "Staff manage batch enrollments" ON public.batch_enrollments;
CREATE POLICY "Staff manage batch enrollments"
    ON public.batch_enrollments FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles AS profile
            WHERE profile.id = (SELECT auth.uid())
              AND profile.role::text IN ('super_admin', 'admin', 'operations')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles AS profile
            WHERE profile.id = (SELECT auth.uid())
              AND profile.role::text IN ('super_admin', 'admin', 'operations')
        )
    );

-- 8. RLS Policies: public.batch_sessions
DROP POLICY IF EXISTS "Staff and participants view batch sessions" ON public.batch_sessions;
CREATE POLICY "Staff and participants view batch sessions"
    ON public.batch_sessions FOR SELECT
    TO authenticated
    USING (
        conducted_by = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.batches AS b
            WHERE b.id = public.batch_sessions.batch_id AND b.teacher_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.batch_enrollments AS be
            WHERE be.batch_id = public.batch_sessions.batch_id AND be.student_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles AS profile
            WHERE profile.id = (SELECT auth.uid())
              AND profile.role::text IN ('super_admin', 'admin', 'operations', 'hr')
        )
    );

DROP POLICY IF EXISTS "Staff and assigned tutors manage batch sessions" ON public.batch_sessions;
CREATE POLICY "Staff and assigned tutors manage batch sessions"
    ON public.batch_sessions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.batches AS b
            WHERE b.id = public.batch_sessions.batch_id AND b.teacher_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles AS profile
            WHERE profile.id = (SELECT auth.uid())
              AND profile.role::text IN ('super_admin', 'admin', 'operations')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.batches AS b
            WHERE b.id = public.batch_sessions.batch_id AND b.teacher_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles AS profile
            WHERE profile.id = (SELECT auth.uid())
              AND profile.role::text IN ('super_admin', 'admin', 'operations')
        )
    );

-- 9. RLS Policies: public.batch_learning_content
DROP POLICY IF EXISTS "Staff and participants view batch content" ON public.batch_learning_content;
CREATE POLICY "Staff and participants view batch content"
    ON public.batch_learning_content FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.batches AS b
            WHERE b.id = public.batch_learning_content.batch_id AND b.teacher_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.batch_enrollments AS be
            WHERE be.batch_id = public.batch_learning_content.batch_id AND be.student_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles AS profile
            WHERE profile.id = (SELECT auth.uid())
              AND profile.role::text IN ('super_admin', 'admin', 'operations', 'hr')
        )
    );

DROP POLICY IF EXISTS "Staff and assigned tutors manage batch content" ON public.batch_learning_content;
CREATE POLICY "Staff and assigned tutors manage batch content"
    ON public.batch_learning_content FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.batches AS b
            WHERE b.id = public.batch_learning_content.batch_id AND b.teacher_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles AS profile
            WHERE profile.id = (SELECT auth.uid())
              AND profile.role::text IN ('super_admin', 'admin', 'operations')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.batches AS b
            WHERE b.id = public.batch_learning_content.batch_id AND b.teacher_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles AS profile
            WHERE profile.id = (SELECT auth.uid())
              AND profile.role::text IN ('super_admin', 'admin', 'operations')
        )
    );

-- Permissions grants
REVOKE ALL ON TABLE public.batches FROM anon;
REVOKE ALL ON TABLE public.batch_enrollments FROM anon;
REVOKE ALL ON TABLE public.batch_sessions FROM anon;
REVOKE ALL ON TABLE public.batch_learning_content FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.batches TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.batch_enrollments TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.batch_sessions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.batch_learning_content TO authenticated, service_role;
