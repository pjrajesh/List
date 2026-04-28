-- Listorix — Supabase schema (copy-paste into Supabase SQL editor and RUN)
-- ============================================================================
-- After running this, your database will have:
--   - profiles, groups, group_members, invites, items, device_tokens
--   - Auto-create profile on signup
--   - Auto-add group owner as member
--   - Row-Level Security protecting all tables
--   - An accept_invite() function
--   - Realtime publication on items
-- ============================================================================

-- 1. PROFILES --------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. GROUPS ----------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text default '👥',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.groups enable row level security;

-- 3. GROUP_MEMBERS ---------------------------------------------------------
create table if not exists public.group_members (
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

alter table public.group_members enable row level security;

-- Helper function to check if current user is a member of a group (avoids RLS recursion)
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

-- Group policies
drop policy if exists "groups_select_members" on public.groups;
create policy "groups_select_members" on public.groups
  for select to authenticated
  using (public.is_group_member(id));

drop policy if exists "groups_insert_authed" on public.groups;
create policy "groups_insert_authed" on public.groups
  for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "groups_update_owner" on public.groups;
create policy "groups_update_owner" on public.groups
  for update to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "groups_delete_owner" on public.groups;
create policy "groups_delete_owner" on public.groups
  for delete to authenticated
  using (auth.uid() = owner_id);

-- Group members policies
drop policy if exists "gm_select_same_group" on public.group_members;
create policy "gm_select_same_group" on public.group_members
  for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "gm_insert_self" on public.group_members;
create policy "gm_insert_self" on public.group_members
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "gm_delete_self_or_owner" on public.group_members;
create policy "gm_delete_self_or_owner" on public.group_members
  for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  );

-- Auto-add owner as member on group creation
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

-- 4. INVITES ---------------------------------------------------------------
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz,
  max_uses int default 50,
  uses int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_invites_token on public.invites(token);

alter table public.invites enable row level security;

drop policy if exists "invites_select_token" on public.invites;
create policy "invites_select_token" on public.invites
  for select to authenticated using (true);  -- anyone authed can read by token

drop policy if exists "invites_insert_member" on public.invites;
create policy "invites_insert_member" on public.invites
  for insert to authenticated
  with check (public.is_group_member(group_id) and auth.uid() = created_by);

drop policy if exists "invites_delete_owner" on public.invites;
create policy "invites_delete_owner" on public.invites
  for delete to authenticated
  using (
    exists (select 1 from public.groups g where g.id = invites.group_id and g.owner_id = auth.uid())
  );

-- RPC: accept invite by token → joins caller to the group
create or replace function public.accept_invite(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invites%rowtype;
  v_group public.groups%rowtype;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_invite from public.invites where token = p_token;
  if not found then
    return json_build_object('ok', false, 'error', 'invalid_token');
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    return json_build_object('ok', false, 'error', 'expired');
  end if;

  if v_invite.uses >= v_invite.max_uses then
    return json_build_object('ok', false, 'error', 'max_uses_reached');
  end if;

  select * into v_group from public.groups where id = v_invite.group_id;

  -- Idempotent: if already a member, just return success
  if exists (select 1 from public.group_members where group_id = v_invite.group_id and user_id = auth.uid()) then
    return json_build_object('ok', true, 'group_id', v_group.id, 'group_name', v_group.name, 'already_member', true);
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_invite.group_id, auth.uid(), 'member');

  update public.invites set uses = uses + 1 where id = v_invite.id;

  return json_build_object('ok', true, 'group_id', v_group.id, 'group_name', v_group.name, 'already_member', false);
end;
$$;

-- 5. ITEMS -----------------------------------------------------------------
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  price numeric,
  category text,
  emoji text,
  color text,
  checked boolean default false,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- exactly one of group_id or owner_id must be set
  constraint items_scope_xor check ((group_id is null) <> (owner_id is null))
);

create index if not exists idx_items_group on public.items(group_id);
create index if not exists idx_items_owner on public.items(owner_id);

alter table public.items enable row level security;

drop policy if exists "items_select" on public.items;
create policy "items_select" on public.items
  for select to authenticated using (
    (owner_id is not null and owner_id = auth.uid())
    or (group_id is not null and public.is_group_member(group_id))
  );

drop policy if exists "items_insert" on public.items;
create policy "items_insert" on public.items
  for insert to authenticated with check (
    created_by = auth.uid() and (
      (owner_id is not null and owner_id = auth.uid() and group_id is null)
      or (group_id is not null and owner_id is null and public.is_group_member(group_id))
    )
  );

drop policy if exists "items_update" on public.items;
create policy "items_update" on public.items
  for update to authenticated using (
    (owner_id is not null and owner_id = auth.uid())
    or (group_id is not null and public.is_group_member(group_id))
  );

drop policy if exists "items_delete" on public.items;
create policy "items_delete" on public.items
  for delete to authenticated using (
    (owner_id is not null and owner_id = auth.uid())
    or (group_id is not null and public.is_group_member(group_id))
  );

-- Auto-update updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists items_touch on public.items;
create trigger items_touch before update on public.items
  for each row execute function public.touch_updated_at();

-- 6. DEVICE TOKENS (for push notifications) -------------------------------
create table if not exists public.device_tokens (
  user_id uuid references auth.users(id) on delete cascade,
  expo_push_token text not null,
  platform text,
  updated_at timestamptz default now(),
  primary key (user_id, expo_push_token)
);

alter table public.device_tokens enable row level security;

drop policy if exists "dt_own" on public.device_tokens;
create policy "dt_own" on public.device_tokens
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 7. REALTIME --------------------------------------------------------------
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.group_members;

-- Done! ✅
