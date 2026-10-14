-- 1. Create academy_holidays table
CREATE TABLE IF NOT EXISTS public.academy_holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  holiday_date DATE NOT NULL UNIQUE,
  description TEXT,
  cancelled_classes_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add columns to live_classes for holiday tracking and cancellation reason
ALTER TABLE public.live_classes
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS holiday_id UUID REFERENCES public.academy_holidays(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS live_classes_holiday_id_idx ON public.live_classes(holiday_id);
CREATE INDEX IF NOT EXISTS academy_holidays_date_idx ON public.academy_holidays(holiday_date);

-- 3. Row Level Security for academy_holidays
ALTER TABLE public.academy_holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public authenticated can view holidays" ON public.academy_holidays;
CREATE POLICY "Public authenticated can view holidays"
  ON public.academy_holidays
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Staff can manage holidays" ON public.academy_holidays;
CREATE POLICY "Staff can manage holidays"
  ON public.academy_holidays
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role::text IN ('super_admin', 'admin', 'hr', 'operations')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role::text IN ('super_admin', 'admin', 'hr', 'operations')
    )
  );

REVOKE ALL ON TABLE public.academy_holidays FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.academy_holidays TO authenticated;
