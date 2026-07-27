-- Restore authenticated profile visibility for dashboard joins.
-- Several dashboard queries join tutor/student IDs to profiles.full_name.

grant select on table public.profiles to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Authenticated profiles are viewable by logged-in users.'
  ) then
    create policy "Authenticated profiles are viewable by logged-in users."
      on public.profiles
      for select
      to authenticated
      using (true);
  end if;
end $$;
