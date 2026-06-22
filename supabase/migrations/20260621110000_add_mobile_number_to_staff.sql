-- Add mobile_number column to staff_details table
ALTER TABLE public.staff_details ADD COLUMN IF NOT EXISTS mobile_number TEXT;

-- Allow students to also manage student_materials where they are the student
DROP POLICY IF EXISTS "Teachers and Admins can manage student_materials" ON public.student_materials;

CREATE POLICY "Teachers, Students, and Admins can manage student_materials"
    ON public.student_materials FOR ALL
    USING (
        auth.uid() = teacher_id OR 
        auth.uid() = student_id OR 
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );
