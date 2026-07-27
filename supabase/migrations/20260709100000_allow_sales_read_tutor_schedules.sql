-- Allow logged-in staff to read active tutor schedules for the Tutor Schedules page.
-- The page runs client-side, so authenticated users need table privileges plus RLS.

grant select on table public.class_schedules to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'class_schedules'
      and policyname = 'Staff can view active tutor schedules.'
  ) then
    create policy "Staff can view active tutor schedules."
      on public.class_schedules
      for select
      to authenticated
      using (
        status = 'active'
        and exists (
          select 1
          from public.profiles
          where id = auth.uid()
            and role in ('sales', 'sales_head', 'hr', 'operations', 'admin', 'super_admin')
        )
      );
  end if;
end $$;
