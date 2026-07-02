-- Forward-only security corrections for multi-subject tutor access and reminders.

-- Tutors assigned in any subject slot need the same row access as the primary
-- tutor. Replace the original single-slot policies with predicates that match
-- the expanded assignment model.
DROP POLICY IF EXISTS "Teachers can view assigned students details"
  ON public.student_details;
CREATE POLICY "Teachers can view assigned students details"
  ON public.student_details
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      assigned_teacher_id,
      assigned_teacher_id_2,
      assigned_teacher_id_3,
      assigned_teacher_id_4,
      assigned_teacher_id_5
    )
  );

DROP POLICY IF EXISTS "Teachers can update assigned students details"
  ON public.student_details;
CREATE POLICY "Teachers can update assigned students details"
  ON public.student_details
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      assigned_teacher_id,
      assigned_teacher_id_2,
      assigned_teacher_id_3,
      assigned_teacher_id_4,
      assigned_teacher_id_5
    )
  )
  WITH CHECK (
    auth.uid() IN (
      assigned_teacher_id,
      assigned_teacher_id_2,
      assigned_teacher_id_3,
      assigned_teacher_id_4,
      assigned_teacher_id_5
    )
  );

-- The service role bypasses RLS and does not need a permissive write policy.
DROP POLICY IF EXISTS "Allow admin to manage logs"
  ON public.class_reminders_log;
DROP POLICY IF EXISTS "Allow authenticated users to read logs"
  ON public.class_reminders_log;

REVOKE ALL ON TABLE public.class_reminders_log FROM anon, authenticated;
GRANT SELECT ON TABLE public.class_reminders_log TO authenticated;

-- Audit access is limited to operational roles.
CREATE POLICY "Privileged staff can read reminder logs"
  ON public.class_reminders_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin', 'operations')
    )
  );

-- Remove any historical duplicates before enforcing one delivery record per
-- class and recipient.
DELETE FROM public.class_reminders_log
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY class_id, recipient_email
        ORDER BY sent_at, id
      ) AS duplicate_number
    FROM public.class_reminders_log
  ) duplicate_rows
  WHERE duplicate_number > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS class_reminders_log_class_recipient_key
  ON public.class_reminders_log (class_id, recipient_email);
