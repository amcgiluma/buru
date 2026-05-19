create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'lobby' check (status in ('lobby', 'bidding', 'playing', 'hand_result', 'game_over')),
  settings jsonb not null default '{}'::jsonb,
  game_state jsonb not null default '{}'::jsonb,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  seat integer not null,
  lives integer not null default 4,
  status text not null default 'active' check (status in ('active', 'eliminated', 'disconnected')),
  is_host boolean not null default false,
  client_token_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(room_id, seat)
);

create unique index if not exists players_room_name_ci_idx
on public.players(room_id, (lower(name)));

create table if not exists public.room_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.room_events enable row level security;

drop policy if exists "players are readable for realtime" on public.players;
create policy "players are readable for realtime"
on public.players for select
to anon
using (true);

drop policy if exists "room events are readable for realtime" on public.room_events;
create policy "room events are readable for realtime"
on public.room_events for select
to anon
using (true);

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists rooms_touch_updated_at on public.rooms;
create trigger rooms_touch_updated_at
before update on public.rooms
for each row execute function public.touch_updated_at();

drop trigger if exists players_touch_updated_at on public.players;
create trigger players_touch_updated_at
before update on public.players
for each row execute function public.touch_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'players'
  ) then
    alter publication supabase_realtime add table public.players;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_events'
  ) then
    alter publication supabase_realtime add table public.room_events;
  end if;
end $$;
