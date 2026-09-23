-- Allow missing email addresses; keep the existing format check for supplied emails.
alter table public.leads alter column correo drop not null;
