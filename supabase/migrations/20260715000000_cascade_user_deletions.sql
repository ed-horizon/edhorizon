-- Migration: Preserve audit and payroll history when users are deleted.

-- Payroll is a financial ledger. Snapshot the staff identity on each item and
-- retain the item after the corresponding account is removed.
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

-- Audit references are optional and should not prevent account removal.
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
