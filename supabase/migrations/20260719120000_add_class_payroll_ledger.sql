-- Record the exact payroll contribution of each verified class. This is an
-- expand-only change: existing classes remain valid and historical pay cannot
-- be re-priced if a teacher's hourly rate changes later.
ALTER TABLE public.live_classes
  ADD COLUMN IF NOT EXISTS payroll_item_id UUID REFERENCES public.payroll_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payroll_amount NUMERIC(12, 2);

ALTER TABLE public.live_classes
  DROP CONSTRAINT IF EXISTS live_classes_payroll_amount_nonnegative;

ALTER TABLE public.live_classes
  ADD CONSTRAINT live_classes_payroll_amount_nonnegative
  CHECK (payroll_amount IS NULL OR payroll_amount >= 0);

CREATE INDEX IF NOT EXISTS live_classes_payroll_item_id_idx
  ON public.live_classes (payroll_item_id)
  WHERE payroll_item_id IS NOT NULL;

COMMENT ON COLUMN public.live_classes.payroll_item_id IS
  'The payroll item credited when this class was verified.';
COMMENT ON COLUMN public.live_classes.payroll_amount IS
  'Immutable amount credited for this verified class; use for reversals instead of the current hourly rate.';
