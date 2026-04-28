-- Listorix — Usage quotas for Voice + Scan AI features
-- Run after notifications_schema.sql. Idempotent.
-- ============================================================================

-- Daily usage tracking, keyed by user + LOCAL day (sent by client as YYYY-MM-DD)
create table if not exists public.usage_quotas (
  user_id uuid references auth.users(id) on delete cascade,
  day_local date not null,
  voice_count int not null default 0,
  scan_count  int not null default 0,
  updated_at  timestamptz default now(),
  primary key (user_id, day_local)
);

create index if not exists idx_usage_quotas_user on public.usage_quotas(user_id);

alter table public.usage_quotas enable row level security;

drop policy if exists "uq_select_own" on public.usage_quotas;
create policy "uq_select_own" on public.usage_quotas
  for select to authenticated using (user_id = auth.uid());

-- Note: writes are performed only by the backend with the service role key,
-- so we don't expose insert/update/delete policies to authenticated users.

-- Done! ✅
