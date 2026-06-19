
-- Allow Teachers to view details of students assigned to them
CREATE POLICY "Teachers can view assigned students details"
ON public.student_details
FOR SELECT
USING (
  auth.uid() = assigned_teacher_id
);

-- Allow Teachers to update preferred link/time for students assigned to them
CREATE POLICY "Teachers can update assigned students details"
ON public.student_details
FOR UPDATE
USING (
  auth.uid() = assigned_teacher_id
)
WITH CHECK (
  auth.uid() = assigned_teacher_id
);

-- Ensure Teachers can also see the profiles of their assigned students
-- (Existing policy "Public profiles are viewable by everyone" already covers this, 
-- but we'll re-verify the profile role checks if needed)
