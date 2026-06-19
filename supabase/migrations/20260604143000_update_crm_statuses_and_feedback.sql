-- Migration: Update CRM Lead Statuses and Add Feedback Column

-- 1. Add new enum values to lead_status
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'converted';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'not_converted';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'feedback';

-- 2. Add feedback column
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS feedback text;

-- 3. Migrate any existing leads using old status names
UPDATE public.leads SET status = 'converted' WHERE status = 'closed_won';
UPDATE public.leads SET status = 'not_converted' WHERE status = 'closed_lost';

-- 4. Re-seed pipeline_stages table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pipeline_stages') THEN
        TRUNCATE TABLE public.pipeline_stages CASCADE;
        INSERT INTO public.pipeline_stages (label, slug, order_index) VALUES
        ('New', 'new', 0),
        ('Contacted', 'contacted', 1),
        ('Demo Scheduled', 'demo_scheduled', 2),
        ('Feedback', 'feedback', 3),
        ('Converted', 'converted', 4),
        ('Not Converted', 'not_converted', 5);
    END IF;
END $$;

-- 5. Create Sales Notes Table
CREATE TABLE IF NOT EXISTS public.sales_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.sales_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Super Admins have full access to sales notes"
  ON public.sales_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Sales can manage notes for their leads"
  ON public.sales_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE id = lead_id AND (assigned_to = auth.uid() OR auth.uid() IS NOT NULL)
    )
  );

-- 6. Refactor leads table RLS Policies to permit lead reassignment/transfer
DROP POLICY IF EXISTS "Super Admins have full access to leads" ON public.leads;
DROP POLICY IF EXISTS "Sales can view and manage their assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;

-- Admins and Super Admins get full read/write access
CREATE POLICY "Admins and Super Admins have full access to leads"
  ON public.leads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Sales: View leads currently assigned to them
CREATE POLICY "Sales can view their leads"
  ON public.leads FOR SELECT
  USING (assigned_to = auth.uid());

-- Sales: Insert new leads assigned to themselves
CREATE POLICY "Sales can insert leads"
  ON public.leads FOR INSERT
  WITH CHECK (assigned_to = auth.uid());

-- Sales: Update leads currently assigned to them (and allow reassignment/transfer)
CREATE POLICY "Sales can update their leads"
  ON public.leads FOR UPDATE
  USING (assigned_to = auth.uid())
  WITH CHECK (true); -- Enforces that they own the lead being updated, but allows setting assigned_to to another agent

-- Sales: Delete leads assigned to them
CREATE POLICY "Sales can delete their leads"
  ON public.leads FOR DELETE
  USING (assigned_to = auth.uid());



