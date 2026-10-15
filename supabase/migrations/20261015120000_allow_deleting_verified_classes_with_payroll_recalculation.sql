-- Migration: 20261015120000_allow_deleting_verified_classes_with_payroll_recalculation.sql
-- Purpose:
-- 1. Allow deleting or reverting old verified classes without blocking exceptions,
--    automatically adjusting the basic_amount in the linked payroll item.
-- 2. Allow verifying older completed classes without blocking exceptions on finalized payroll runs.

-- 1. Update change_class_log_with_payroll to smoothly recalculate payroll on deletion of old classes
CREATE OR REPLACE FUNCTION public.change_class_log_with_payroll(
  p_class_id UUID,
  p_action TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_class public.live_classes%ROWTYPE;
  v_item public.payroll_items%ROWTYPE;
  v_run_id UUID;
  v_next_basic NUMERIC(12, 2);
  v_month INTEGER;
  v_year INTEGER;
BEGIN
  IF p_action NOT IN ('revert', 'delete') THEN
    RAISE EXCEPTION 'Invalid action specified.';
  END IF;

  SELECT * INTO v_class
  FROM public.live_classes
  WHERE id = p_class_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class session not found.';
  END IF;

  -- If class was verified or has recorded payroll amount, adjust payroll ledger
  IF COALESCE(v_class.payroll_amount, 0) > 0 THEN
    v_item.id := NULL;

    -- 1. Try finding by linked payroll_item_id
    IF v_class.payroll_item_id IS NOT NULL THEN
      SELECT * INTO v_item
      FROM public.payroll_items
      WHERE id = v_class.payroll_item_id
      FOR UPDATE;
    END IF;

    -- 2. If not found by linked id, look up by teacher_id and scheduled month/year
    IF v_item.id IS NULL AND v_class.teacher_id IS NOT NULL AND v_class.scheduled_at IS NOT NULL THEN
      v_month := EXTRACT(MONTH FROM v_class.scheduled_at)::INTEGER;
      v_year := EXTRACT(YEAR FROM v_class.scheduled_at)::INTEGER;

      SELECT id INTO v_run_id
      FROM public.payroll_runs
      WHERE month = v_month AND year = v_year
      ORDER BY created_at, id
      LIMIT 1;

      IF v_run_id IS NOT NULL THEN
        SELECT * INTO v_item
        FROM public.payroll_items
        WHERE run_id = v_run_id AND staff_id = v_class.teacher_id
        ORDER BY created_at, id
        LIMIT 1
        FOR UPDATE;
      END IF;
    END IF;

    -- 3. If payroll item found, safely deduct class payroll_amount
    IF v_item.id IS NOT NULL THEN
      v_next_basic := GREATEST(0, COALESCE(v_item.basic_amount, 0) - v_class.payroll_amount);
      UPDATE public.payroll_items
      SET basic_amount = v_next_basic
      WHERE id = v_item.id;
    END IF;
  END IF;

  -- Remove attendance records
  DELETE FROM public.student_attendance WHERE class_id = p_class_id;

  IF p_action = 'revert' THEN
    UPDATE public.live_classes
    SET status = 'scheduled',
        topic_taught = NULL,
        homework_given = NULL,
        student_performance = NULL,
        parent_note = NULL,
        tutor_joined_at = NULL,
        student_joined_at = NULL,
        tutor_joined_late = NULL,
        verification_status = NULL,
        verified_by = NULL,
        payroll_item_id = NULL,
        payroll_amount = NULL,
        parent_verified = NULL,
        parent_dispute_reason = NULL,
        rejection_reason = NULL,
        rejected_at = NULL
    WHERE id = p_class_id;
  ELSE
    DELETE FROM public.live_classes WHERE id = p_class_id;
  END IF;
END
$function$;

REVOKE ALL ON FUNCTION public.change_class_log_with_payroll(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_class_log_with_payroll(UUID, TEXT) TO service_role;

-- 2. Update verify_class_attendance_with_payroll to smoothly verify older completed classes
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

    SELECT * INTO v_item
    FROM public.payroll_items
    WHERE run_id = v_run.id AND staff_id = v_class.teacher_id
    ORDER BY created_at, id
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
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

REVOKE ALL ON FUNCTION public.verify_class_attendance_with_payroll(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_class_attendance_with_payroll(UUID, UUID, TEXT, TEXT) TO service_role;
