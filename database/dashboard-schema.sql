-- Credify dashboard storage. Run once in Supabase Dashboard > SQL Editor.
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  provider text,
  issued_on date,
  credential_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.scholarship_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  scholarship_name text not null,
  institution text,
  deadline date,
  status text not null default 'saved' check (status in ('saved','applied','documents','under_review','interview','awarded','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.course_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  course_name text not null,
  provider text,
  course_url text,
  progress smallint not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.certificates enable row level security;
alter table public.scholarship_applications enable row level security;
alter table public.course_progress enable row level security;

drop policy if exists "Users manage their certificates" on public.certificates;
create policy "Users manage their certificates" on public.certificates for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage their scholarship applications" on public.scholarship_applications;
create policy "Users manage their scholarship applications" on public.scholarship_applications for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage their course progress" on public.course_progress;
create policy "Users manage their course progress" on public.course_progress for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.certificates to authenticated;
grant select, insert, update, delete on public.scholarship_applications to authenticated;
grant select, insert, update, delete on public.course_progress to authenticated;

create or replace function public.set_course_progress_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists course_progress_updated_at on public.course_progress;
create trigger course_progress_updated_at before update on public.course_progress for each row execute function public.set_course_progress_updated_at();


alter table public.scholarship_applications add column if not exists official_url text;


-- Store certificate metadata against its completed course.
alter table public.certificates
  add column if not exists course_id uuid references public.course_progress(id) on delete set null;
alter table public.certificates
  add column if not exists file_path text;

-- Private file storage: each signed-in user can access only files under their own user-id folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-certificates', 'Course certificates', false, 10485760, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read their course certificates" on storage.objects;
create policy "Users read their course certificates"
on storage.objects for select to authenticated
using (bucket_id = 'course-certificates' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users upload their course certificates" on storage.objects;
create policy "Users upload their course certificates"
on storage.objects for insert to authenticated
with check (bucket_id = 'course-certificates' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users delete their course certificates" on storage.objects;
create policy "Users delete their course certificates"
on storage.objects for delete to authenticated
using (bucket_id = 'course-certificates' and (storage.foldername(name))[1] = (select auth.uid())::text);
