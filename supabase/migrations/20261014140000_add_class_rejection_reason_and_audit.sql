-- Migration: 20261014140000_add_class_rejection_reason_and_audit.sql
-- Purpose: Add rejection_reason and rejected_at to live_classes, allow 'rejected' in live_classes status check,
-- and update verify_class_attendance_with_payroll to record rejection reason and exclude rejected classes from payroll.

-- 1. Add rejection_reason and rejected_at columns to live_classes
ALTER TABLE public.live_classes
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- 2. Update status CHECK constraint on live_classes to include 'rejected'
ALTER TABLE public.live_classes
  DROP CONSTRAINT IF EXISTS live_classes_status_check;

ALTER TABLE public.live_classes
  ADD CONSTRAINT live_classes_status_check
  CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled', 'rejected'));

-- 3. Update verify_class_attendance_with_payroll to accept optional rejection reason and handle rejection atomically
CREATE OR REPLACE FUNCTION public.verify_class_attendance_with_payroll(
  p_class_id UUID,
  p_verified_by UUID,
  p_verification_status TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_class public.live_classes%ROWTYPE;
  v_run public.payroll_runs%ROWTYPE;
  v_item public.payroll_items%ROWTYPE;
  v_pay_basis TEXT;
  v_base_rate NUMERIC := 0;
  v_custom_rate NUMERIC;
  v_rate NUMERIC := 0;
  v_session_pay NUMERIC(12, 2) := 0;
  v_month INTEGER;
  v_year INTEGER;
  v_staff_name TEXT;
  v_staff_email TEXT;
  v_employee_id TEXT;
  v_next_basic NUMERIC(12, 2);
BEGIN
  IF p_verification_status NOT IN ('verified', 'rejected') THEN
    RAISE EXCEPTION 'Invalid verification status.';
  END IF;

  SELECT * INTO v_class
  FROM public.live_classes
  WHERE id = p_class_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class session not found.';
  END IF;

  IF p_verification_status = 'rejected' THEN
    IF v_class.verification_status = 'verified' THEN
      RAISE EXCEPTION 'A verified class must be reverted with its payroll adjustment.';
    END IF;

    IF p_rejection_reason IS NULL OR TRIM(p_rejection_reason) = '' THEN
      RAISE EXCEPTION 'A rejection reason is mandatory when rejecting a class.';
    END IF;

    UPDATE public.live_classes
    SET status = 'rejected',
        verification_status = 'rejected',
        rejection_reason = TRIM(p_rejection_reason),
        rejected_at = NOW(),
        verified_by = p_verified_by,
        payroll_item_id = NULL,
        payroll_amount = 0
    WHERE id = p_class_id;
    RETURN;
  END IF;

  IF v_class.verification_status = 'verified' THEN
    RETURN;
  END IF;

  IF v_class.teacher_id IS NULL OR v_class.scheduled_at IS NULL THEN
    RAISE EXCEPTION 'Class must have a teacher and scheduled date before verification.';
  END IF;

  SELECT COALESCE(staff.pay_basis, 'hourly'),
         COALESCE(staff.hourly_rate, 0),
         COALESCE(profile.full_name, split_part(profile.email, '@', 1)),
         profile.email,
         COALESCE(staff.employee_id, profile.id::TEXT)
  INTO v_pay_basis, v_base_rate, v_staff_name, v_staff_email, v_employee_id
  FROM public.profiles AS profile
  LEFT JOIN public.staff_details AS staff ON staff.id = profile.id
  WHERE profile.id = v_class.teacher_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Teacher profile not found.';
  END IF;

  IF v_class.student_id IS NOT NULL THEN
    SELECT tutor_hourly_rate INTO v_custom_rate
    FROM public.student_details
    WHERE id = v_class.student_id;
  END IF;

  IF v_pay_basis <> 'fixed' THEN
    v_rate := CASE WHEN COALESCE(v_custom_rate, 0) > 0 THEN v_custom_rate ELSE v_base_rate END;
    v_session_pay := ROUND((COALESCE(v_class.duration_hours, 1) * GREATEST(v_rate, 0))::NUMERIC, 2);
  END IF;

  IF v_session_pay > 0 THEN
    v_month := EXTRACT(MONTH FROM v_class.scheduled_at)::INTEGER;
    v_year := EXTRACT(YEAR FROM v_class.scheduled_at)::INTEGER;

    PERFORM pg_advisory_xact_lock(hashtextextended(v_year::TEXT || ':' || v_month, 0));

    SELECT * INTO v_run
    FROM public.payroll_runs
    WHERE month = v_month AND year = v_year
    ORDER BY created_at, id
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
      INSERT INTO public.payroll_runs (month, year, created_by)
      VALUES (v_month, v_year, p_verified_by)
      RETURNING * INTO v_run;
    END IF;

    IF v_run.status IN ('processed', 'completed', 'paid', 'cancelled') THEN
      RAISE EXCEPTION 'This class belongs to a finalized payroll run. Record an adjustment instead.';
    END IF;

    SELECT * INTO v_item
    FROM public.payroll_items
    WHERE run_id = v_run.id AND staff_id = v_class.teacher_id
    ORDER BY created_at, id
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      IF v_item.payout_status IN ('processing', 'paid') THEN
        RAISE EXCEPTION 'This payroll item is finalized. Record an adjustment instead.';
      END IF;

      v_next_basic := COALESCE(v_item.basic_amount, 0) + v_session_pay;
      UPDATE public.payroll_items
      SET basic_amount = v_next_basic,
          staff_name = COALESCE(v_item.staff_name, v_staff_name),
          staff_email = COALESCE(v_item.staff_email, v_staff_email),
          staff_employee_id = COALESCE(v_item.staff_employee_id, v_employee_id)
      WHERE id = v_item.id;
    ELSE
      INSERT INTO public.payroll_items (
        run_id, staff_id, basic_amount, bonus_amount, deductions_amount,
        deductions, payout_status, staff_name, staff_email,
        staff_employee_id
      ) VALUES (
        v_run.id, v_class.teacher_id, v_session_pay, 0, 0,
        0, 'pending', v_staff_name, v_staff_email,
        v_employee_id
      )
      ON CONFLICT (run_id, staff_id)
      DO UPDATE SET
        basic_amount = public.payroll_items.basic_amount + EXCLUDED.basic_amount,
        staff_name = COALESCE(public.payroll_items.staff_name, EXCLUDED.staff_name),
        staff_email = COALESCE(public.payroll_items.staff_email, EXCLUDED.staff_email),
        staff_employee_id = COALESCE(public.payroll_items.staff_employee_id, EXCLUDED.staff_employee_id)
      RETURNING * INTO v_item;
    END IF;
  END IF;

  UPDATE public.live_classes
  SET verification_status = 'verified',
      verified_by = p_verified_by,
      payroll_item_id = CASE WHEN v_session_pay > 0 THEN v_item.id ELSE NULL END,
      payroll_amount = v_session_pay
  WHERE id = p_class_id;
END
$function$;

-- 4. Permissions for verify_class_attendance_with_payroll
REVOKE ALL ON FUNCTION public.verify_class_attendance_with_payroll(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_class_attendance_with_payroll(UUID, UUID, TEXT, TEXT) TO service_role;
