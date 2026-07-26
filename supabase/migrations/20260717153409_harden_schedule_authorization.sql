-- Align development and production schedule authorization.
-- Teachers may manage only their own rows. Administrative schedule staff may
-- manage all rows. Students may read their own schedules, and sales staff may
-- read active tutor schedules without receiving mutation access.

ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view class schedules" ON public.class_schedules;
DROP POLICY IF EXISTS "Teachers and Admins manage class schedules" ON public.class_schedules;
DROP POLICY IF EXISTS "Assigned teachers and staff manage class schedules" ON public.class_schedules;
DROP POLICY IF EXISTS "Participants and staff can view class schedules" ON public.class_schedules;
DROP POLICY IF EXISTS "Staff can view active tutor schedules." ON public.class_schedules;

CREATE POLICY "Participants and staff can view class schedules"
ON public.class_schedules
FOR SELECT
TO authenticated
USING (
  student_id = (SELECT auth.uid())
  OR teacher_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role::text IN ('super_admin', 'admin', 'hr', 'operations')
  )
);

CREATE POLICY "Staff can view active tutor schedules."
ON public.class_schedules
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role::text IN ('sales', 'sales_head')
  )
);

CREATE POLICY "Assigned teachers and staff manage class schedules"
ON public.class_schedules
FOR ALL
TO authenticated
USING (
  teacher_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role::text IN ('super_admin', 'admin', 'hr', 'operations')
  )
)
WITH CHECK (
  teacher_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role::text IN ('super_admin', 'admin', 'hr', 'operations')
  )
);

DROP POLICY IF EXISTS "Public can view live classes" ON public.live_classes;
DROP POLICY IF EXISTS "Teachers can manage own classes" ON public.live_classes;
DROP POLICY IF EXISTS "Assigned teachers and staff manage live classes" ON public.live_classes;
DROP POLICY IF EXISTS "Participants and staff can view live classes" ON public.live_classes;

CREATE POLICY "Participants and staff can view live classes"
ON public.live_classes
FOR SELECT
TO authenticated
USING (
  student_id = (SELECT auth.uid())
  OR teacher_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role::text IN ('super_admin', 'admin', 'hr', 'operations')
  )
);

CREATE POLICY "Assigned teachers and staff manage live classes"
ON public.live_classes
FOR ALL
TO authenticated
USING (
  teacher_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role::text IN ('super_admin', 'admin', 'hr', 'operations')
  )
)
WITH CHECK (
  teacher_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role::text IN ('super_admin', 'admin', 'hr', 'operations')
  )
);

REVOKE ALL ON TABLE public.class_schedules FROM anon;
REVOKE ALL ON TABLE public.live_classes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.class_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.live_classes TO authenticated;
