-- Forward-only reconciliation for environments whose historical migration
-- versions predate the committed HR and schedule hardening migrations.
-- This migration is intentionally idempotent and does not modify migration
-- history. A later forward migration can restore an individual policy or
-- constraint if a rollback is required.

-- Preserve payroll ledger context after staff account deletion.
ALTER TABLE public.payroll_items
ADD COLUMN IF NOT EXISTS staff_name TEXT,
ADD COLUMN IF NOT EXISTS staff_email TEXT,
ADD COLUMN IF NOT EXISTS staff_employee_id TEXT;

UPDATE public.payroll_items AS item
SET staff_name = COALESCE(item.staff_name, profile.full_name),
    staff_email = COALESCE(item.staff_email, profile.email),
    staff_employee_id = COALESCE(item.staff_employee_id, staff.employee_id)
FROM public.profiles AS profile
LEFT JOIN public.staff_details AS staff ON staff.id = profile.id
WHERE item.staff_id = profile.id;

ALTER TABLE public.payroll_items
ALTER COLUMN staff_id DROP NOT NULL,
DROP CONSTRAINT IF EXISTS payroll_items_staff_id_fkey,
ADD CONSTRAINT payroll_items_staff_id_fkey
  FOREIGN KEY (staff_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- Keep optional audit references from blocking account removal.
UPDATE public.student_attendance AS attendance
SET marked_by = NULL
WHERE marked_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles AS profile WHERE profile.id = attendance.marked_by
  );

ALTER TABLE public.student_attendance
DROP CONSTRAINT IF EXISTS student_attendance_marked_by_fkey,
ADD CONSTRAINT student_attendance_marked_by_fkey
  FOREIGN KEY (marked_by)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

UPDATE public.teacher_attendance AS attendance
SET verified_by = NULL
WHERE verified_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles AS profile WHERE profile.id = attendance.verified_by
  );

ALTER TABLE public.teacher_attendance
DROP CONSTRAINT IF EXISTS teacher_attendance_verified_by_fkey,
ADD CONSTRAINT teacher_attendance_verified_by_fkey
  FOREIGN KEY (verified_by)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

UPDATE public.live_classes AS class
SET verified_by = NULL
WHERE verified_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles AS profile WHERE profile.id = class.verified_by
  );

ALTER TABLE public.live_classes
DROP CONSTRAINT IF EXISTS live_classes_verified_by_fkey,
ADD CONSTRAINT live_classes_verified_by_fkey
  FOREIGN KEY (verified_by)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

UPDATE public.capsules AS capsule
SET author_id = NULL
WHERE author_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users AS account WHERE account.id = capsule.author_id
  );

ALTER TABLE public.capsules
DROP CONSTRAINT IF EXISTS capsules_author_id_fkey,
ADD CONSTRAINT capsules_author_id_fkey
  FOREIGN KEY (author_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- Keep free-form display titles separate from authorization roles.
ALTER TABLE public.staff_details
ADD COLUMN IF NOT EXISTS job_title TEXT;

UPDATE public.staff_details AS staff
SET job_title = initcap(replace(profile.role::text, '_', ' '))
FROM public.profiles AS profile
WHERE profile.id = staff.id
  AND NULLIF(btrim(staff.job_title), '') IS NULL;

COMMENT ON COLUMN public.staff_details.job_title IS
  'Free-form display title. Authorization must continue to use profiles.role.';

-- Apply the hardened schedule authorization model consistently.
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
