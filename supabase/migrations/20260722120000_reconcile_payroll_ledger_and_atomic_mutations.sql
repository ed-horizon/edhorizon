-- Reconcile the historical payroll schema with the ledger shape already used
-- by the application, then make class/payroll mutations transactional.

ALTER TABLE public.payroll_runs
  ALTER COLUMN month TYPE TEXT USING month::TEXT;

ALTER TABLE public.payroll_items
  ADD COLUMN IF NOT EXISTS run_id UUID,
  ADD COLUMN IF NOT EXISTS basic_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS bonus_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deductions_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS staff_name TEXT,
  ADD COLUMN IF NOT EXISTS staff_email TEXT,
  ADD COLUMN IF NOT EXISTS staff_employee_id TEXT;

DO $reconcile$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payroll_items' AND column_name = 'payroll_run_id'
  ) THEN
    EXECUTE 'UPDATE public.payroll_items SET run_id = COALESCE(run_id, payroll_run_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payroll_items' AND column_name = 'amount'
  ) THEN
    EXECUTE 'UPDATE public.payroll_items SET basic_amount = COALESCE(basic_amount, amount)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payroll_items' AND column_name = 'bonus'
  ) THEN
    EXECUTE 'UPDATE public.payroll_items SET bonus_amount = COALESCE(bonus_amount, bonus, 0)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payroll_items' AND column_name = 'status'
  ) THEN
    EXECUTE $sql$UPDATE public.payroll_items
      SET payout_status = CASE
        WHEN status IN ('pending', 'processing', 'paid', 'failed') THEN status
        ELSE COALESCE(payout_status, 'pending')
      END$sql$;
  END IF;
END
$reconcile$;

DO $generated$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payroll_items' AND column_name = 'net_amount'
  ) THEN
    ALTER TABLE public.payroll_items
      ADD COLUMN net_amount NUMERIC(12, 2)
      GENERATED ALWAYS AS (basic_amount + bonus_amount - deductions_amount) STORED;
  END IF;
END
$generated$;

UPDATE public.payroll_items
SET basic_amount = COALESCE(basic_amount, 0),
    bonus_amount = COALESCE(bonus_amount, 0),
    deductions_amount = COALESCE(deductions_amount, deductions, 0),
    payout_status = COALESCE(payout_status, 'pending');

UPDATE public.payroll_items AS item
SET staff_name = COALESCE(item.staff_name, profile.full_name),
    staff_email = COALESCE(item.staff_email, profile.email),
    staff_employee_id = COALESCE(item.staff_employee_id, staff.employee_id)
FROM public.profiles AS profile
LEFT JOIN public.staff_details AS staff ON staff.id = profile.id
WHERE item.staff_id = profile.id;

ALTER TABLE public.payroll_items
  ALTER COLUMN basic_amount SET DEFAULT 0,
  ALTER COLUMN bonus_amount SET DEFAULT 0,
  ALTER COLUMN deductions_amount SET DEFAULT 0,
  ALTER COLUMN payout_status SET DEFAULT 'pending',
  ALTER COLUMN run_id SET NOT NULL,
  ALTER COLUMN basic_amount SET NOT NULL,
  ALTER COLUMN payout_status SET NOT NULL;

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.payroll_items'::regclass
      AND conname = 'payroll_items_run_id_fkey'
  ) THEN
    ALTER TABLE public.payroll_items
      ADD CONSTRAINT payroll_items_run_id_fkey
      FOREIGN KEY (run_id) REFERENCES public.payroll_runs(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.payroll_items'::regclass
      AND conname = 'payroll_items_payout_status_check'
  ) THEN
    ALTER TABLE public.payroll_items
      ADD CONSTRAINT payroll_items_payout_status_check
      CHECK (payout_status IN ('pending', 'processing', 'paid', 'failed'));
  END IF;
END
$constraints$;

CREATE UNIQUE INDEX IF NOT EXISTS payroll_runs_month_year_key
  ON public.payroll_runs (month, year);
CREATE INDEX IF NOT EXISTS payroll_items_run_id_idx
  ON public.payroll_items (run_id);
CREATE INDEX IF NOT EXISTS payroll_items_run_staff_idx
  ON public.payroll_items (run_id, staff_id)
  WHERE staff_id IS NOT NULL;

ALTER TABLE public.live_classes
  ADD COLUMN IF NOT EXISTS payroll_item_id UUID REFERENCES public.payroll_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payroll_amount NUMERIC(12, 2);

CREATE OR REPLACE FUNCTION public.verify_class_attendance_with_payroll(
  p_class_id UUID,
  p_verified_by UUID,
  p_verification_status TEXT
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
  v_month TEXT;
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

    UPDATE public.live_classes
    SET verification_status = 'rejected', verified_by = p_verified_by
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
    v_month := EXTRACT(MONTH FROM v_class.scheduled_at)::INTEGER::TEXT;
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
  v_run public.payroll_runs%ROWTYPE;
  v_next_basic NUMERIC(12, 2);
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

  IF v_class.verification_status = 'verified' THEN
    IF v_class.payroll_amount IS NULL THEN
      RAISE EXCEPTION 'This verified class has no payroll ledger amount. Record a manual payroll adjustment first.';
    END IF;

    IF v_class.payroll_amount > 0 THEN
      IF v_class.payroll_item_id IS NULL THEN
        RAISE EXCEPTION 'This verified class has no payroll ledger entry. Record a manual payroll adjustment first.';
      END IF;

      SELECT * INTO v_item
      FROM public.payroll_items
      WHERE id = v_class.payroll_item_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'The linked payroll item could not be found.';
      END IF;

      SELECT * INTO v_run
      FROM public.payroll_runs
      WHERE id = v_item.run_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'The linked payroll run could not be found.';
      END IF;

      IF v_run.status IN ('processed', 'completed', 'paid')
         OR v_item.payout_status IN ('processing', 'paid') THEN
        RAISE EXCEPTION 'This class belongs to finalized payroll. Record an adjustment instead.';
      END IF;

      v_next_basic := COALESCE(v_item.basic_amount, 0) - v_class.payroll_amount;
      IF v_next_basic < 0 THEN
        RAISE EXCEPTION 'The payroll ledger is inconsistent. Record a manual adjustment first.';
      END IF;

      UPDATE public.payroll_items
      SET basic_amount = v_next_basic
      WHERE id = v_item.id;
    END IF;
  END IF;

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
        parent_dispute_reason = NULL
    WHERE id = p_class_id;
  ELSE
    DELETE FROM public.live_classes WHERE id = p_class_id;
  END IF;
END
$function$;

REVOKE ALL ON FUNCTION public.verify_class_attendance_with_payroll(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.change_class_log_with_payroll(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_class_attendance_with_payroll(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.change_class_log_with_payroll(UUID, TEXT) TO service_role;
