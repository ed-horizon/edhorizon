-- Migration: Cascade User Deletions
-- Adjust foreign key constraints on tables referencing profiles/users to support user deletion.

-- 1. Adjust payroll_items staff foreign key to delete items if the staff record is removed
-- Clean up any orphaned payroll items first to prevent constraint violations
DELETE FROM public.payroll_items 
WHERE staff_id IS NOT NULL 
AND staff_id NOT IN (SELECT id FROM public.staff_details);

ALTER TABLE public.payroll_items 
DROP CONSTRAINT IF EXISTS payroll_items_staff_id_fkey,
ADD CONSTRAINT payroll_items_staff_id_fkey 
  FOREIGN KEY (staff_id) 
  REFERENCES public.staff_details(id) 
  ON DELETE CASCADE;

-- 2. Adjust student_attendance marked_by foreign key to set null if the marking user is deleted
-- Clean up any orphaned marked_by references
UPDATE public.student_attendance 
SET marked_by = NULL 
WHERE marked_by IS NOT NULL 
AND marked_by NOT IN (SELECT id FROM public.profiles);

ALTER TABLE public.student_attendance 
DROP CONSTRAINT IF EXISTS student_attendance_marked_by_fkey,
ADD CONSTRAINT student_attendance_marked_by_fkey 
  FOREIGN KEY (marked_by) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- 3. Adjust teacher_attendance verified_by foreign key to set null if the verifying user is deleted
-- Clean up any orphaned verified_by references
UPDATE public.teacher_attendance 
SET verified_by = NULL 
WHERE verified_by IS NOT NULL 
AND verified_by NOT IN (SELECT id FROM public.profiles);

ALTER TABLE public.teacher_attendance 
DROP CONSTRAINT IF EXISTS teacher_attendance_verified_by_fkey,
ADD CONSTRAINT teacher_attendance_verified_by_fkey 
  FOREIGN KEY (verified_by) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- 4. Adjust live_classes verified_by foreign key to set null if the auditor is deleted
-- Clean up any orphaned verified_by references
UPDATE public.live_classes 
SET verified_by = NULL 
WHERE verified_by IS NOT NULL 
AND verified_by NOT IN (SELECT id FROM public.profiles);

ALTER TABLE public.live_classes
DROP CONSTRAINT IF EXISTS live_classes_verified_by_fkey,
ADD CONSTRAINT live_classes_verified_by_fkey
  FOREIGN KEY (verified_by)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- 5. Adjust capsules author_id foreign key to set null if the teacher is deleted
-- Clean up any orphaned author_id references
UPDATE public.capsules 
SET author_id = NULL 
WHERE author_id IS NOT NULL 
AND author_id NOT IN (SELECT id FROM auth.users);

ALTER TABLE public.capsules
DROP CONSTRAINT IF EXISTS capsules_author_id_fkey,
ADD CONSTRAINT capsules_author_id_fkey
  FOREIGN KEY (author_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
