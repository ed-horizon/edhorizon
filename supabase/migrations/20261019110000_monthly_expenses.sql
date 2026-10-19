-- Create monthly_expenses table for tracking manual operational overhead and other expenses
CREATE TABLE IF NOT EXISTS public.monthly_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  expense_date DATE DEFAULT CURRENT_DATE NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS monthly_expenses_year_month_idx ON public.monthly_expenses(year, month);
CREATE INDEX IF NOT EXISTS monthly_expenses_date_idx ON public.monthly_expenses(expense_date);

-- Enable Row Level Security (RLS)
ALTER TABLE public.monthly_expenses ENABLE ROW LEVEL SECURITY;

-- 1. SELECT policy: Restricted to Super Admin, Admin, and Operations
DROP POLICY IF EXISTS "Staff can view monthly expenses" ON public.monthly_expenses;
CREATE POLICY "Staff can view monthly expenses"
  ON public.monthly_expenses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role::text IN ('super_admin', 'admin', 'operations')
    )
  );

-- 2. INSERT policy: Restricted to Super Admin, Admin, and Operations
DROP POLICY IF EXISTS "Staff can insert monthly expenses" ON public.monthly_expenses;
CREATE POLICY "Staff can insert monthly expenses"
  ON public.monthly_expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles AS profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role::text IN ('super_admin', 'admin', 'operations')
    )
  );

-- 3. UPDATE policy: Restricted to Super Admin, Admin, and Operations
DROP POLICY IF EXISTS "Staff can update monthly expenses" ON public.monthly_expenses;
CREATE POLICY "Staff can update monthly expenses"
  ON public.monthly_expenses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role::text IN ('super_admin', 'admin', 'operations')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles AS profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role::text IN ('super_admin', 'admin', 'operations')
    )
  );

-- 4. DELETE policy: Restricted to Super Admin, Admin, and Operations
DROP POLICY IF EXISTS "Staff can delete monthly expenses" ON public.monthly_expenses;
CREATE POLICY "Staff can delete monthly expenses"
  ON public.monthly_expenses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role::text IN ('super_admin', 'admin', 'operations')
    )
  );

-- Revoke all permissions from anon
REVOKE ALL ON TABLE public.monthly_expenses FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.monthly_expenses TO authenticated;
GRANT ALL ON TABLE public.monthly_expenses TO service_role;
