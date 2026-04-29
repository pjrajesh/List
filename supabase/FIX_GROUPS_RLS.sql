-- =============================================================================
-- LISTORIX — RLS HOTFIX for "new row violates row-level security policy for
-- table 'groups'"
--
-- Why this happens:
--   Your Supabase project has an older/stale RLS policy on `public.groups`
--   (or `public.group_members`) whose `with check` clause does NOT match the
--   latest schema. The previous `drop policy if exists` calls only drop by
--   exact name, so old policies with different names silently survive.
--
-- What this script does:
--   1. Drops EVERY policy currently attached to `public.groups`,
--      `public.group_members`, and `public.invites`.
--   2. Recreates the correct, minimal policies.
--   3. Reinstalls the `is_group_member()` helper (recursion-safe).
--   4. Reinstalls the `handle_new_group` trigger that auto-adds the owner
--      as a member.
--
-- HOW TO RUN:
--   1. Open Supabase Dashboard → SQL Editor.
--   2. Paste this entire file. Click RUN.
--   3. Try creating a group in the app again.
-- =============================================================================

-- 0. Make sure RLS is enabled
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
alter table public.invites       enable row level security;

-- 1. DROP ALL EXISTING POLICIES on these tables (any name, any clause)
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('groups', 'group_members', 'invites')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 2. Helper function — single source of truth, no recursion
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

-- 3. groups POLICIES
create policy "groups_select_members" on public.groups
  for select to authenticated
  using (public.is_group_member(id));

create policy "groups_insert_authed" on public.groups
  for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "groups_update_owner" on public.groups
  for update to authenticated
  using (auth.uid() = owner_id);

create policy "groups_delete_owner" on public.groups
  for delete to authenticated
  using (auth.uid() = owner_id);

-- 4. group_members POLICIES
create policy "gm_select_same_group" on public.group_members
  for select to authenticated
  using (public.is_group_member(group_id));

create policy "gm_insert_self" on public.group_members
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "gm_delete_self_or_owner" on public.group_members
  for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  );

-- 5. invites POLICIES
create policy "invites_select_token" on public.invites
  for select to authenticated using (true);

create policy "invites_insert_member" on public.invites
  for insert to authenticated
  with check (public.is_group_member(group_id) and auth.uid() = created_by);

create policy "invites_delete_owner" on public.invites
  for delete to authenticated
  using (
    exists (select 1 from public.groups g where g.id = invites.group_id and g.owner_id = auth.uid())
  );

-- 6. Trigger that auto-adds the creator as the 'owner' member.
--    This lets `groups_select_members` return the just-inserted row to the creator.
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_group_created on public.groups;
create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();

-- 7. Sanity check — list installed policies (read-only)
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('groups', 'group_members', 'invites')
order by tablename, policyname;
