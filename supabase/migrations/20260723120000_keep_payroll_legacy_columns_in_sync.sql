-- Development already applied the original ledger reconciliation before the
-- rollout compatibility trigger was added to that migration. Reconcile any
-- writes made since then and install the same trigger as a forward-only change.

-- Some reconciled environments had already removed the legacy columns even
-- though the currently deployed application still writes them. Restore the
-- compatibility surface before installing the synchronization trigger.
ALTER TABLE public.payroll_items
  ADD COLUMN IF NOT EXISTS payroll_run_id UUID,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS bonus NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deductions NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

UPDATE public.payroll_items
SET payroll_run_id = run_id,
    amount = basic_amount,
    bonus = bonus_amount,
    deductions = deductions_amount,
    status = payout_status
WHERE payroll_run_id IS DISTINCT FROM run_id
   OR amount IS DISTINCT FROM basic_amount
   OR bonus IS DISTINCT FROM bonus_amount
   OR deductions IS DISTINCT FROM deductions_amount
   OR status IS DISTINCT FROM payout_status;

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
