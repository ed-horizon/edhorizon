
-- 1. Staff Details (Extension of Profiles)
CREATE TABLE IF NOT EXISTS public.staff_details (
  id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  basic_salary NUMERIC(12, 2) DEFAULT 0,
  bank_name TEXT,
  account_number TEXT,
  joining_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active'
);

-- 2. Student Details (Extension of Profiles)
CREATE TABLE IF NOT EXISTS public.student_details (
  id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  grade_level TEXT,
  monthly_fee NUMERIC(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'active'
);

-- 3. Payroll Hierarchy
CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status TEXT DEFAULT 'draft', -- 'draft', 'processed', 'paid'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, year)
);

CREATE TABLE IF NOT EXISTS public.payroll_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_run_id UUID REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff_details(id),
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.staff_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;

-- 5. Security Policies

-- HR and Super Admin: Full Access to HR data
CREATE POLICY "HR and Super Admin full access to staff_details"
  ON public.staff_details FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'super_admin')));

CREATE POLICY "HR and Super Admin full access to payroll_runs"
  ON public.payroll_runs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'super_admin')));

CREATE POLICY "HR and Super Admin full access to payroll_items"
  ON public.payroll_items FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'super_admin')));

-- Student Isolation: Students can only see their own details
CREATE POLICY "Students can see own student_details"
  ON public.student_details FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins and Super Admins can manage student_details"
  ON public.student_details FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'hr')));

-- Capsules Polish: Admins can update any capsule status (Approval Flow)
CREATE POLICY "Admins can update capsule status"
  ON public.capsules FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
