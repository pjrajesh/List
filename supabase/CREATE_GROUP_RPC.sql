-- =============================================================================
-- LISTORIX — create_group RPC
--
-- Creates a group + owner membership in a single transaction, running with
-- SECURITY DEFINER so it is immune to RLS misconfiguration on `groups` /
-- `group_members`. This is the recommended way to create groups from the app.
--
-- HOW TO RUN:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Paste this entire file. Click RUN.
-- =============================================================================

create or replace function public.create_group(
  p_name  text,
  p_emoji text default '👥'
)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_group   public.groups;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_name is null or length(btrim(p_name)) = 0 then
    raise exception 'name_required' using errcode = '22023';
  end if;

  insert into public.groups (name, emoji, owner_id)
  values (btrim(p_name), coalesce(nullif(p_emoji, ''), '👥'), v_user_id)
  returning * into v_group;

  -- Ensure the owner is a member (idempotent — a trigger may also insert)
  insert into public.group_members (group_id, user_id, role)
  values (v_group.id, v_user_id, 'owner')
  on conflict (group_id, user_id) do nothing;

  return v_group;
end;
$$;

-- Allow any authenticated user to call this RPC
revoke all on function public.create_group(text, text) from public;
grant execute on function public.create_group(text, text) to authenticated;
