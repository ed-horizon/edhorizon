-- Migration: Update leads RLS policies to grant Sales Heads full access
DROP POLICY IF EXISTS "Admins and Super Admins have full access to leads" ON public.leads;

CREATE POLICY "Admins, Super Admins and Sales Heads have full access to leads"
  ON public.leads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'sales_head')
    )
  );
