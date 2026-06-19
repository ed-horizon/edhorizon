-- 1. Update Class Schedules RLS Policy
DROP POLICY IF EXISTS "Teachers and Admins manage class schedules" ON public.class_schedules;
CREATE POLICY "Teachers and Admins manage class schedules"
  ON public.class_schedules FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'super_admin', 'hr', 'operations')));

-- 2. Update Live Classes RLS Policy
DROP POLICY IF EXISTS "Teachers can manage own classes" ON public.live_classes;
CREATE POLICY "Teachers can manage own classes"
  ON public.live_classes FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'super_admin', 'hr', 'operations')));

-- 3. Update Student Attendance RLS Policy
DROP POLICY IF EXISTS "Teachers and Admins can manage student attendance" ON public.student_attendance;
CREATE POLICY "Teachers and Admins can manage student attendance"
  ON public.student_attendance FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'super_admin', 'hr', 'operations')));

-- 4. Update Student Details RLS Policy
DROP POLICY IF EXISTS "Admins and Super Admins can manage student_details" ON public.student_details;
CREATE POLICY "Admins and Super Admins can manage student_details"
  ON public.student_details FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'hr', 'operations')));
