-- Migration: Cascade User Deletions
-- Adjust foreign key constraints on tables referencing profiles/users to support user deletion.

-- 1. Adjust payroll_items staff foreign key to delete items if the staff record is removed
ALTER TABLE public.payroll_items 
DROP CONSTRAINT IF EXISTS payroll_items_staff_id_fkey,
ADD CONSTRAINT payroll_items_staff_id_fkey 
  FOREIGN KEY (staff_id) 
  REFERENCES public.staff_details(id) 
  ON DELETE CASCADE;

-- 2. Adjust student_attendance marked_by foreign key to set null if the marking user is deleted
ALTER TABLE public.student_attendance 
DROP CONSTRAINT IF EXISTS student_attendance_marked_by_fkey,
ADD CONSTRAINT student_attendance_marked_by_fkey 
  FOREIGN KEY (marked_by) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- 3. Adjust teacher_attendance verified_by foreign key to set null if the verifying user is deleted
ALTER TABLE public.teacher_attendance 
DROP CONSTRAINT IF EXISTS teacher_attendance_verified_by_fkey,
ADD CONSTRAINT teacher_attendance_verified_by_fkey 
  FOREIGN KEY (verified_by) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- 4. Adjust live_classes verified_by foreign key to set null if the auditor is deleted
ALTER TABLE public.live_classes
DROP CONSTRAINT IF EXISTS live_classes_verified_by_fkey,
ADD CONSTRAINT live_classes_verified_by_fkey
  FOREIGN KEY (verified_by)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- 5. Adjust capsules author_id foreign key to set null if the teacher is deleted
ALTER TABLE public.capsules
DROP CONSTRAINT IF EXISTS capsules_author_id_fkey,
ADD CONSTRAINT capsules_author_id_fkey
  FOREIGN KEY (author_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
