-- Allow every authenticated user to read all leads and advisor names so the
-- ranking/podium can show every advisor's count, not just their own.
begin;
drop policy leads_read on public.leads;
create policy leads_read on public.leads for select to authenticated using(true);
drop policy profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using(true);
commit;
