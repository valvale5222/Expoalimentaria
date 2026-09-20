begin;

grant delete on public.leads to authenticated;
create policy leads_delete on public.leads
  for delete to authenticated
  using(owner_id=(select auth.uid()));

commit;
