-- Allow Admin and HR access to staff_details
DROP POLICY IF EXISTS "HR and Super Admin full access to staff_details" ON public.staff_details;
CREATE POLICY "Admin, HR and Super Admin full access to staff_details"
  ON public.staff_details FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'super_admin', 'admin')));

-- Allow Admin and HR access to payroll_runs
DROP POLICY IF EXISTS "HR and Super Admin full access to payroll_runs" ON public.payroll_runs;
CREATE POLICY "Admin, HR and Super Admin full access to payroll_runs"
  ON public.payroll_runs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'super_admin', 'admin')));

-- Allow Admin and HR access to payroll_items
DROP POLICY IF EXISTS "HR and Super Admin full access to payroll_items" ON public.payroll_items;
CREATE POLICY "Admin, HR and Super Admin full access to payroll_items"
  ON public.payroll_items FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'super_admin', 'admin')));
