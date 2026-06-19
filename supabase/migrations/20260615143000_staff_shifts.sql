-- Create Staff Shifts table for tracking staff shift clock-ins/outs
CREATE TABLE IF NOT EXISTS public.staff_shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  clock_in TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  clock_out TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Staff can view own shifts" ON public.staff_shifts;
DROP POLICY IF EXISTS "Staff can insert own shifts" ON public.staff_shifts;
DROP POLICY IF EXISTS "Staff can update own shifts" ON public.staff_shifts;
DROP POLICY IF EXISTS "Super admin can select all shifts" ON public.staff_shifts;
DROP POLICY IF EXISTS "Super admin can manage shifts" ON public.staff_shifts;

-- Add Policies
CREATE POLICY "Staff can view own shifts"
  ON public.staff_shifts FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Staff can insert own shifts"
  ON public.staff_shifts FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Staff can update own shifts"
  ON public.staff_shifts FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Super admin can select all shifts"
  ON public.staff_shifts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Super admin can manage shifts"
  ON public.staff_shifts FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
