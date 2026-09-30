-- Ejecutar completo en SQL Editor sobre el proyecto existente, antes de publicar el frontend.
begin;
alter table public.leads
 add column commercial_status text not null default 'nuevo' check (commercial_status in ('nuevo','seguimiento','trabajo','pospuesto','perdido','cancelado')),
 add column responsible_id uuid references public.profiles(id),
 add column cargo text not null default '',
 add column next_action text not null default '',
 add column next_action_date date,
 add column last_management text,
 add column last_management_at timestamptz,
 add column commercial_version integer not null default 0;
update public.leads set responsible_id = owner_id;
alter table public.leads alter column responsible_id set not null;
create index leads_responsible on public.leads(responsible_id);
create index leads_next_action on public.leads(next_action_date);
create table public.lead_events (
 id uuid primary key default gen_random_uuid(),
 lead_id uuid not null references public.leads(id) on delete cascade,
 actor_id uuid references public.profiles(id) on delete set null,
 actor_name text not null,
 created_at timestamptz not null default now(),
 kind text not null,
 body text not null,
 management_type text,
 old_status text,
 new_status text,
 old_responsible_id uuid,
 new_responsible_id uuid
);
create index lead_events_timeline on public.lead_events(lead_id,created_at desc);
alter table public.lead_events enable row level security;
revoke all on public.lead_events from anon, authenticated;
grant select on public.lead_events to authenticated;
create policy events_read on public.lead_events for select to authenticated using (
 exists(select 1 from public.leads l where l.id=lead_id and (l.owner_id=auth.uid() or l.responsible_id=auth.uid() or public.is_admin()))
);
insert into public.lead_events(lead_id,actor_id,actor_name,created_at,kind,body)
 select l.id,l.owner_id,p.full_name,l.created_at,'created','Lead registrado.' from public.leads l join public.profiles p on p.id=l.owner_id;
create function public.initialize_lead_commercial() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.responsible_id := new.owner_id;
 new.commercial_status := 'nuevo';
 new.commercial_version := 0;
 new.next_action := '';
 new.next_action_date := null;
 new.last_management := null;
 new.last_management_at := null;
 return new;
end $$;
create trigger initialize_lead_commercial before insert on public.leads for each row execute function public.initialize_lead_commercial();
create function public.log_lead_created() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.lead_events(lead_id,actor_id,actor_name,kind,body) select new.id,new.owner_id,full_name,'created','Lead registrado.' from public.profiles where id=new.owner_id;
 return new;
end $$;
create trigger log_lead_created after insert on public.leads for each row execute function public.log_lead_created();
create function public.update_lead_commercial(p_lead_id uuid, p_version integer, p_changes jsonb)
returns public.leads language plpgsql security definer set search_path='' as $$
declare
 l public.leads; actor text; target uuid; previous_name text; target_name text;
 s text; action_text text; action_date date; note text; channel text;
begin
 select * into l from public.leads where id=p_lead_id for update;
 if not found then raise exception 'Lead no encontrado.'; end if;
 if auth.uid() is null or not (l.owner_id=auth.uid() or l.responsible_id=auth.uid() or public.is_admin()) then raise exception 'No tienes permiso para gestionar este lead.'; end if;
 if l.commercial_version is distinct from p_version then raise exception 'Otro usuario actualizó este lead. Cierra el detalle y actualiza la lista antes de continuar.'; end if;
 select full_name into actor from public.profiles where id=auth.uid();
 if actor is null then raise exception 'Perfil no encontrado.'; end if;
 if p_changes ? 'responsible_id' then
  target := (p_changes->>'responsible_id')::uuid;
  select full_name into target_name from public.profiles where id=target;
  if target_name is null then raise exception 'Responsable no válido.'; end if;
  if target <> l.responsible_id then
   select full_name into previous_name from public.profiles where id=l.responsible_id;
   insert into public.lead_events(lead_id,actor_id,actor_name,kind,body,old_responsible_id,new_responsible_id)
   values(l.id,auth.uid(),actor,'transfer',format('Lead derivado de %s a %s.',previous_name,target_name),l.responsible_id,target);
   l.responsible_id := target;
  end if;
 else
  s := coalesce(p_changes->>'status',l.commercial_status);
  if s not in ('nuevo','seguimiento','trabajo','pospuesto','perdido','cancelado') then raise exception 'Estado no válido.'; end if;
  note := trim(coalesce(p_changes->>'comment',''));
  channel := nullif(p_changes->>'management_type','');
  if length(note)>4000 or (channel is not null and channel not in ('Llamada','WhatsApp','Correo','Reunión','Visita','Otro')) then raise exception 'Comentario o tipo de gestión no válido.'; end if;
  if channel is not null and note='' then raise exception 'Agrega un comentario para registrar la gestión.'; end if;
  if note<>'' or s<>l.commercial_status then
   insert into public.lead_events(lead_id,actor_id,actor_name,kind,body,management_type,old_status,new_status)
   values(l.id,auth.uid(),actor,case when note<>'' then 'comment' else 'status' end,case when note<>'' then note else 'Estado actualizado.' end,channel,case when s<>l.commercial_status then l.commercial_status end,case when s<>l.commercial_status then s end);
  end if;
  if note<>'' then l.last_management := note; l.last_management_at := now(); end if;
  l.commercial_status := s;
  action_text := trim(coalesce(p_changes->>'next_action',l.next_action));
  action_date := case when p_changes ? 'next_action_date' then nullif(p_changes->>'next_action_date','')::date else l.next_action_date end;
  if length(action_text)>500 or (action_date is not null and action_text='') then raise exception 'Indica una próxima acción de hasta 500 caracteres.'; end if;
  if action_text is distinct from l.next_action or action_date is distinct from l.next_action_date then
   insert into public.lead_events(lead_id,actor_id,actor_name,kind,body) values(l.id,auth.uid(),actor,'next_action',format('Próxima acción actualizada: %s · %s',coalesce(nullif(action_text,''),'Sin acción'),coalesce(to_char(action_date,'DD/MM/YYYY'),'Sin fecha')));
  end if;
  l.next_action := action_text; l.next_action_date := action_date;
 end if;
 update public.leads set responsible_id=l.responsible_id,commercial_status=l.commercial_status,next_action=l.next_action,next_action_date=l.next_action_date,last_management=l.last_management,last_management_at=l.last_management_at,commercial_version=commercial_version+1 where id=l.id returning * into l;
 return l;
end $$;
revoke all on function public.initialize_lead_commercial(),public.log_lead_created(),public.update_lead_commercial(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.update_lead_commercial(uuid,integer,jsonb) to authenticated;
-- La edición comercial pasa exclusivamente por la función transaccional.
revoke update on public.leads from authenticated;
create policy photos_read_assigned on storage.objects for select to authenticated using (
 bucket_id='lead-photos' and exists(select 1 from public.leads where photo_path=name and responsible_id=auth.uid())
);
commit;
