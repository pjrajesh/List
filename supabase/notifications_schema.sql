-- Listorix — Notification preferences schema
-- Run this in Supabase SQL editor AFTER schema.sql
-- ============================================================================

-- 1. NOTIFICATION_PREFERENCES ----------------------------------------------
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  muted boolean not null default false,
  item_added boolean not null default true,
  item_checked boolean not null default true,
  member_joined boolean not null default true,
  invite_received boolean not null default true,
  suggestion_reminders boolean not null default true,
  -- Quiet hours: stored as integers 0..23. If start == end, no quiet hours.
  -- Logic: if start < end → quiet between [start, end); if start > end → quiet wraps midnight.
  quiet_start int not null default 22,
  quiet_end   int not null default 8,
  quiet_enabled boolean not null default false,
  updated_at timestamptz default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "np_own" on public.notification_preferences;
create policy "np_own" on public.notification_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Auto-create row for new users
create or replace function public.handle_new_user_prefs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_prefs on auth.users;
create trigger on_auth_user_created_prefs
  after insert on auth.users
  for each row execute function public.handle_new_user_prefs();

-- Backfill existing users
insert into public.notification_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Done! ✅
