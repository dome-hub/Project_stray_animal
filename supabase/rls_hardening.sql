-- rls_hardening.sql
--
-- Closes the privilege-escalation gap: AdminPage.jsx used to call
-- supabase.from('users').update({ role }) directly from the browser, so the
-- only thing stopping a logged-in user from promoting themselves to admin
-- was RLS — and RLS wasn't set up at all. This script:
--   1. Enables RLS on users/reports/animals/notifications.
--   2. Adds baseline row policies matching how the app already queries
--      each table (see git history for the audit that produced this).
--   3. Locks the users.role / users.status columns away from direct
--      client writes entirely, and routes role/status changes through
--      admin_set_user_role / admin_set_user_status — SECURITY DEFINER
--      functions that check is_admin() themselves. AdminPage.jsx already
--      calls these via supabase.rpc(...) instead of a raw .update().
--
-- Run this in the Supabase Dashboard -> SQL Editor. Review it against your
-- actual schema first (column names below match what the app's code sends,
-- but this wasn't tested against the live database).
--
-- KNOWN GAP left open on purpose: reports_update below allows any
-- authenticated user to update any report row, because ReportAnimal.jsx's
-- "merge into an existing duplicate report" flow legitimately needs to
-- attach photos/detail to a report someone else filed. Tightening that to
-- "owner, or staff, or merging a duplicate" needs turning the merge flow
-- into its own RPC (same pattern as admin_set_user_role) — a follow-up,
-- not done here.

-- ============================================================
-- 1. Helper functions
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_volunteer()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'volunteer'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin() or public.is_volunteer();
$$;

-- ============================================================
-- 2. Enable RLS
-- ============================================================

alter table public.users enable row level security;
alter table public.reports enable row level security;
alter table public.animals enable row level security;
alter table public.notifications enable row level security;

-- ============================================================
-- 3. users
-- ============================================================

drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select
  using (id = auth.uid() or public.is_staff());

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Column-level lock: authenticated users may only write their own profile
-- fields directly. role/status are deliberately NOT granted here.
revoke update on public.users from authenticated;
grant update (name, phone, avatar_url, shelter_name, shelter_location, service_area)
  on public.users to authenticated;

-- Privileged role/status change. SECURITY DEFINER lets this write role/status
-- despite the column revoke above, but only after checking is_admin() itself
-- — a non-admin calling this RPC gets an error, not a silent no-op.
create or replace function public.admin_set_user_role(target_ids uuid[], new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if new_role not in ('user', 'volunteer', 'admin') then
    raise exception 'invalid role: %', new_role;
  end if;
  update public.users set role = new_role where id = any(target_ids);
end;
$$;

create or replace function public.admin_set_user_status(target_ids uuid[], new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if new_status not in ('active', 'suspended') then
    raise exception 'invalid status: %', new_status;
  end if;
  update public.users set status = new_status where id = any(target_ids);
end;
$$;

grant execute on function public.admin_set_user_role(uuid[], text) to authenticated;
grant execute on function public.admin_set_user_status(uuid[], text) to authenticated;

-- ============================================================
-- 4. reports
-- ============================================================

drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
  for select
  using (reporter_id = auth.uid() or public.is_staff());

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
  for insert
  with check (reporter_id = auth.uid());

-- See "KNOWN GAP" note at the top of this file.
drop policy if exists reports_update on public.reports;
create policy reports_update on public.reports
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ============================================================
-- 5. animals
-- ============================================================

drop policy if exists animals_select on public.animals;
create policy animals_select on public.animals
  for select
  using (auth.uid() is not null);

drop policy if exists animals_write on public.animals;
create policy animals_write on public.animals
  for all
  using (public.is_staff())
  with check (public.is_staff());

-- ============================================================
-- 6. notifications
-- ============================================================

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select
  using (user_id = auth.uid() or public.is_staff());

-- Reporters insert their own confirmation notifications; staff insert
-- notifications addressed to a reporter (report_update messages).
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert
  with check (user_id = auth.uid() or public.is_staff());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update
  using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid() or public.is_staff());

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete
  using (user_id = auth.uid() or public.is_staff());
