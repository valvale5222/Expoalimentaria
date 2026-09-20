-- Run once in the SQL Editor of a NEW Supabase project.
begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null check(length(trim(full_name)) between 1 and 100),
 role text not null default 'advisor' check(role in ('advisor','admin')),
 created_at timestamptz not null default now()
);
create table public.leads (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null constraint leads_owner_id_fkey references public.profiles(id),
 nombre text not null check(length(trim(nombre)) between 1 and 200),
 dni text not null default '' check(length(dni)<=15),
 celular text not null check(length(trim(celular)) between 1 and 200),
 correo text not null check(length(correo)<=200 and correo ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 empresa text not null check(length(trim(empresa)) between 1 and 200),
 rubro text not null check(length(trim(rubro)) between 1 and 200),
 producto text not null check(length(trim(producto)) between 1 and 200),
 producto_detalle text not null default '' check(length(producto_detalle)<=200),
 proyecto text not null check(length(trim(proyecto)) between 1 and 200),
 fecha_necesita date not null,
 comentario text not null default '' check(length(comentario)<=4000),
 photo_path text,
 created_at timestamptz not null default now(),
 check(producto <> 'Repuestos' or length(trim(producto_detalle))>0),
 check(photo_path is null or split_part(photo_path,'/',1)=owner_id::text)
);
create index leads_owner_created on public.leads(owner_id,created_at desc);
create index leads_created on public.leads(created_at desc);
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin');
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,full_name,role) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),split_part(new.email,'@',1),'Asesor'),100),'advisor');
 return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
revoke all on public.profiles,public.leads from anon,authenticated;
grant select on public.profiles to authenticated;
grant select,insert on public.leads to authenticated;
create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or (select public.is_admin()));
create policy leads_read on public.leads for select to authenticated using(owner_id=(select auth.uid()) or (select public.is_admin()));
create policy leads_insert on public.leads for insert to authenticated with check(owner_id=(select auth.uid()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('lead-photos','lead-photos',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy photos_insert on storage.objects for insert to authenticated with check(bucket_id='lead-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy photos_read on storage.objects for select to authenticated using(bucket_id='lead-photos' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select public.is_admin())));
create policy photos_remove_orphans on storage.objects for delete to authenticated using(bucket_id='lead-photos' and (storage.foldername(name))[1]=(select auth.uid())::text and not exists(select 1 from public.leads where photo_path=name));
commit;
