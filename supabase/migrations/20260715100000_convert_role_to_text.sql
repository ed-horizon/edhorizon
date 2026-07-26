-- Migration: Add custom staff job titles without widening authorization roles.
--
-- profiles.role is an authorization boundary used by RLS, redirects, and
-- server actions. Keep it on the supported role set and store a free-form
-- display title separately.

ALTER TABLE public.staff_details
ADD COLUMN IF NOT EXISTS job_title TEXT;

-- Give existing staff a useful title while preserving any title already set.
UPDATE public.staff_details AS staff
SET job_title = initcap(replace(profile.role::text, '_', ' '))
FROM public.profiles AS profile
WHERE profile.id = staff.id
  AND NULLIF(btrim(staff.job_title), '') IS NULL;

COMMENT ON COLUMN public.staff_details.job_title IS
  'Free-form display title. Authorization must continue to use profiles.role.';
