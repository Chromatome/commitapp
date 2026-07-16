-- Admin moderation actions: delete a commission or an entire account.
-- Both are exposed as security-definer RPCs so they bypass the normal
-- owner-only RLS policies on `commissions` / `profiles`, but only ever
-- run once `public.is_admin_user()` (defined in 001_reports.sql) confirms
-- the caller holds the admin badge or profiles.is_admin.

-- Delete a single commission listing. Any reports pointing at it keep
-- existing (commission_id is `on delete set null`), so the ticket stays
-- open and simply shows "Deleted commission".
create or replace function public.admin_delete_commission(p_commission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can delete commissions.';
  end if;

  delete from public.commissions where id = p_commission_id;
end;
$$;

revoke all on function public.admin_delete_commission(uuid) from public;
grant execute on function public.admin_delete_commission(uuid) to authenticated;

-- Delete a profile outright. Downstream rows (commissions, reports filed
-- by/against them, etc.) follow whatever on-delete behavior their FKs to
-- profiles already declare (e.g. reports.reported_profile_id cascades,
-- so any report tickets involving this profile are removed too).
--
-- NOTE: this only removes the public.profiles row and everything that
-- cascades from it. It does NOT remove the underlying auth.users record
-- or revoke the person's login — that requires the Supabase Auth admin
-- API (service-role key), which isn't available from this client-only
-- app. Pair this with a server-side call to `supabase.auth.admin.deleteUser`
-- (e.g. from an Edge Function) if you need to fully remove the login too.
create or replace function public.admin_delete_account(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'Only admins can delete accounts.';
  end if;

  delete from public.profiles where id = p_profile_id;
end;
$$;

revoke all on function public.admin_delete_account(uuid) from public;
grant execute on function public.admin_delete_account(uuid) to authenticated;
