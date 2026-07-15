-- Reporting system: reports table, RLS, public flag view, proof storage bucket

-- 1. Reports table
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('commission', 'artist')),
  commission_id uuid references public.commissions (id) on delete set null,
  reported_profile_id uuid not null references public.profiles (id) on delete cascade,
  reason_category text not null,
  description text not null check (char_length(description) >= 20),
  proof_urls text[] not null check (cardinality(proof_urls) > 0),
  status text not null default 'open' check (status in ('open', 'under_review', 'resolved', 'dismissed')),
  admin_notes text,
  resolved_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reports_commission_id_idx on public.reports (commission_id);
create index if not exists reports_reported_profile_id_idx on public.reports (reported_profile_id);
create index if not exists reports_status_idx on public.reports (status);

alter table public.reports enable row level security;

-- Helper: is the current user an admin (admin badge or profiles.is_admin)?
create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and coalesce(p.is_admin, false)
  )
  or exists (
    select 1
    from public.profile_badges pb
    join public.badges b on b.id = pb.badge_id
    where pb.profile_id = auth.uid() and b.slug = 'admin'
  );
$$;

-- RLS policies
drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "reports_select_own_or_admin" on public.reports;
create policy "reports_select_own_or_admin" on public.reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin_user());

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin" on public.reports
  for update to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- 2. Public flag view: exposes only open-report counts per commission
create or replace view public.commission_report_flags
with (security_invoker = false) as
select
  commission_id,
  count(*)::int as open_report_count
from public.reports
where commission_id is not null
  and status in ('open', 'under_review')
group by commission_id;

grant select on public.commission_report_flags to anon, authenticated;

-- 3. Storage bucket for proof screenshots
insert into storage.buckets (id, name, public)
values ('report-proofs', 'report-proofs', true)
on conflict (id) do nothing;

drop policy if exists "report_proofs_upload_own_folder" on storage.objects;
create policy "report_proofs_upload_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'report-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "report_proofs_read" on storage.objects;
create policy "report_proofs_read" on storage.objects
  for select to public
  using (bucket_id = 'report-proofs');
