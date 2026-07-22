-- Reconcile the historical payroll schema with the ledger shape already used
-- by the application, then make class/payroll mutations transactional.

ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.payroll_runs
  ALTER COLUMN month TYPE INTEGER USING month::INTEGER;

ALTER TABLE public.payroll_items
  ADD COLUMN IF NOT EXISTS payroll_run_id UUID,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS bonus NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deductions NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS run_id UUID,
  ADD COLUMN IF NOT EXISTS basic_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS bonus_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS deductions_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS payout_status TEXT,
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
    -- New ledger writes use basic_amount; retain the legacy column only for
    -- backward compatibility without requiring every new insert to dual-write.
    EXECUTE 'ALTER TABLE public.payroll_items ALTER COLUMN amount DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payroll_items' AND column_name = 'bonus'
  ) THEN
    EXECUTE 'UPDATE public.payroll_items SET bonus_amount = COALESCE(bonus_amount, bonus, 0)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payroll_items' AND column_name = 'deductions'
  ) THEN
    EXECUTE 'UPDATE public.payroll_items SET deductions_amount = COALESCE(deductions_amount, deductions, 0)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payroll_items' AND column_name = 'status'
  ) THEN
    EXECUTE $sql$UPDATE public.payroll_items
      SET payout_status = COALESCE(
        payout_status,
        CASE WHEN status IN ('pending', 'processing', 'paid', 'failed') THEN status END,
        'pending'
      )$sql$;
  END IF;
END
$reconcile$;

UPDATE public.payroll_items
SET basic_amount = COALESCE(basic_amount, 0),
    bonus_amount = COALESCE(bonus_amount, 0),
    deductions_amount = COALESCE(deductions_amount, 0),
    payout_status = COALESCE(payout_status, 'pending');

-- Normalize net pay to one generated expression. Existing ordinary or
-- differently-generated columns are safely recomputed from their components.
DO $generated$
DECLARE
  v_is_generated TEXT;
  v_expression TEXT;
BEGIN
  SELECT is_generated, generation_expression
  INTO v_is_generated, v_expression
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'payroll_items'
    AND column_name = 'net_amount';

  IF FOUND AND (
    v_is_generated <> 'ALWAYS'
    OR regexp_replace(COALESCE(v_expression, ''), '[[:space:]]', '', 'g')
       <> '((basic_amount+bonus_amount)-deductions_amount)'
  ) THEN
    ALTER TABLE public.payroll_items DROP COLUMN net_amount;
    v_is_generated := NULL;
  END IF;

  IF v_is_generated IS NULL THEN
    ALTER TABLE public.payroll_items
      ADD COLUMN net_amount NUMERIC(12, 2)
      GENERATED ALWAYS AS (basic_amount + bonus_amount - deductions_amount) STORED;
  END IF;
END
$generated$;

UPDATE public.payroll_items AS item
SET staff_name = COALESCE(item.staff_name, profile.full_name),
    staff_email = COALESCE(item.staff_email, profile.email),
    staff_employee_id = COALESCE(item.staff_employee_id, staff.employee_id)
FROM public.profiles AS profile
LEFT JOIN public.staff_details AS staff ON staff.id = profile.id
WHERE item.staff_id = profile.id;

-- Keep the legacy and normalized ledger columns synchronized while older
-- application instances may still be serving traffic during a migration-first
-- rollout. This trigger is intentionally retained for the full deployment
-- window; a later contract migration can remove the legacy columns and trigger.
CREATE OR REPLACE FUNCTION public.sync_payroll_item_legacy_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.run_id := COALESCE(NEW.run_id, NEW.payroll_run_id);
    NEW.payroll_run_id := COALESCE(NEW.payroll_run_id, NEW.run_id);

    IF COALESCE(NEW.basic_amount, 0) <> 0 THEN
      NEW.amount := NEW.basic_amount;
    ELSE
      NEW.basic_amount := COALESCE(NEW.amount, 0);
      NEW.amount := NEW.basic_amount;
    END IF;

    IF COALESCE(NEW.bonus_amount, 0) <> 0 THEN
      NEW.bonus := NEW.bonus_amount;
    ELSE
      NEW.bonus_amount := COALESCE(NEW.bonus, 0);
      NEW.bonus := NEW.bonus_amount;
    END IF;

    IF COALESCE(NEW.deductions_amount, 0) <> 0 THEN
      NEW.deductions := NEW.deductions_amount;
    ELSE
      NEW.deductions_amount := COALESCE(NEW.deductions, 0);
      NEW.deductions := NEW.deductions_amount;
    END IF;

    IF COALESCE(NEW.payout_status, 'pending') <> 'pending' THEN
      NEW.status := NEW.payout_status;
    ELSE
      NEW.payout_status := COALESCE(NEW.status, 'pending');
      NEW.status := NEW.payout_status;
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.run_id IS DISTINCT FROM OLD.run_id
     AND NEW.payroll_run_id IS NOT DISTINCT FROM OLD.payroll_run_id THEN
    NEW.payroll_run_id := NEW.run_id;
  ELSIF NEW.payroll_run_id IS DISTINCT FROM OLD.payroll_run_id
        AND NEW.run_id IS NOT DISTINCT FROM OLD.run_id THEN
    NEW.run_id := NEW.payroll_run_id;
  ELSIF NEW.run_id IS DISTINCT FROM NEW.payroll_run_id THEN
    RAISE EXCEPTION 'Conflicting payroll run identifiers.';
  END IF;

  IF NEW.basic_amount IS DISTINCT FROM OLD.basic_amount
     AND NEW.amount IS NOT DISTINCT FROM OLD.amount THEN
    NEW.amount := NEW.basic_amount;
  ELSIF NEW.amount IS DISTINCT FROM OLD.amount
        AND NEW.basic_amount IS NOT DISTINCT FROM OLD.basic_amount THEN
    NEW.basic_amount := NEW.amount;
  ELSIF NEW.basic_amount IS DISTINCT FROM NEW.amount THEN
    RAISE EXCEPTION 'Conflicting payroll basic amounts.';
  END IF;

  IF NEW.bonus_amount IS DISTINCT FROM OLD.bonus_amount
     AND NEW.bonus IS NOT DISTINCT FROM OLD.bonus THEN
    NEW.bonus := NEW.bonus_amount;
  ELSIF NEW.bonus IS DISTINCT FROM OLD.bonus
        AND NEW.bonus_amount IS NOT DISTINCT FROM OLD.bonus_amount THEN
    NEW.bonus_amount := NEW.bonus;
  ELSIF NEW.bonus_amount IS DISTINCT FROM NEW.bonus THEN
    RAISE EXCEPTION 'Conflicting payroll bonus amounts.';
  END IF;

  IF NEW.deductions_amount IS DISTINCT FROM OLD.deductions_amount
     AND NEW.deductions IS NOT DISTINCT FROM OLD.deductions THEN
    NEW.deductions := NEW.deductions_amount;
  ELSIF NEW.deductions IS DISTINCT FROM OLD.deductions
        AND NEW.deductions_amount IS NOT DISTINCT FROM OLD.deductions_amount THEN
    NEW.deductions_amount := NEW.deductions;
  ELSIF NEW.deductions_amount IS DISTINCT FROM NEW.deductions THEN
    RAISE EXCEPTION 'Conflicting payroll deduction amounts.';
  END IF;

  IF NEW.payout_status IS DISTINCT FROM OLD.payout_status
     AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    NEW.status := NEW.payout_status;
  ELSIF NEW.status IS DISTINCT FROM OLD.status
        AND NEW.payout_status IS NOT DISTINCT FROM OLD.payout_status THEN
    NEW.payout_status := NEW.status;
  ELSIF NEW.payout_status IS DISTINCT FROM NEW.status THEN
    RAISE EXCEPTION 'Conflicting payroll payout statuses.';
  END IF;

  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS sync_payroll_item_legacy_columns
  ON public.payroll_items;
CREATE TRIGGER sync_payroll_item_legacy_columns
BEFORE INSERT OR UPDATE ON public.payroll_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_payroll_item_legacy_columns();

REVOKE ALL ON FUNCTION public.sync_payroll_item_legacy_columns() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_payroll_item_legacy_columns() FROM anon;
REVOKE ALL ON FUNCTION public.sync_payroll_item_legacy_columns() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sync_payroll_item_legacy_columns() TO service_role;

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

ALTER TABLE public.live_classes
  ADD COLUMN IF NOT EXISTS payroll_item_id UUID REFERENCES public.payroll_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payroll_amount NUMERIC(12, 2);

-- Older UI requests could create more than one full-payout payslip for the same
-- employee and run. Keep one canonical row rather than summing duplicate full
-- payouts, which would inflate the employee's liability.
CREATE TEMP TABLE payroll_item_reconciliation ON COMMIT DROP AS
SELECT id AS item_id,
       first_value(id) OVER (
         PARTITION BY run_id, staff_id
         ORDER BY CASE payout_status
           WHEN 'paid' THEN 4
           WHEN 'processing' THEN 3
           WHEN 'pending' THEN 2
           ELSE 1
         END DESC,
         created_at,
         id
       ) AS keeper_id,
       count(*) OVER (PARTITION BY run_id, staff_id) AS item_count
FROM public.payroll_items
WHERE run_id IS NOT NULL AND staff_id IS NOT NULL;

UPDATE public.live_classes AS class
SET payroll_item_id = mapping.keeper_id
FROM payroll_item_reconciliation AS mapping
WHERE mapping.item_count > 1
  AND mapping.item_id <> mapping.keeper_id
  AND class.payroll_item_id = mapping.item_id;

DELETE FROM public.payroll_items AS item
USING payroll_item_reconciliation AS mapping
WHERE mapping.item_count > 1
  AND mapping.item_id <> mapping.keeper_id
  AND item.id = mapping.item_id;

DROP INDEX IF EXISTS public.payroll_items_run_staff_idx;
CREATE UNIQUE INDEX payroll_items_run_staff_idx
  ON public.payroll_items (run_id, staff_id);

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
  v_run_id UUID;
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

      -- Discover the parent without locking, then lock run -> item in the same
      -- order used by verification to avoid a run/item deadlock cycle.
      SELECT run_id INTO v_run_id
      FROM public.payroll_items
      WHERE id = v_class.payroll_item_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'The linked payroll item could not be found.';
      END IF;

      SELECT * INTO v_run
      FROM public.payroll_runs
      WHERE id = v_run_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'The linked payroll run could not be found.';
      END IF;

      SELECT * INTO v_item
      FROM public.payroll_items
      WHERE id = v_class.payroll_item_id
        AND run_id = v_run.id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'The linked payroll item changed while it was being adjusted.';
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
