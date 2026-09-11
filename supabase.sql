create extension if not exists pgcrypto;

create table if not exists public.rooms (
  code text primary key check (length(code)=5),
  host_id uuid not null,
  state text not null default 'lobby' check (state in ('lobby','playing','finished')),
  round integer not null default 0,
  phase text not null default 'lobby' check (phase in ('lobby','green','red','finished')),
  phase_started_at timestamptz not null default now(),
  winner_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key,
  room_code text not null references public.rooms(code) on delete cascade,
  name text not null check (length(name) between 1 and 20),
  status text not null default 'alive' check (status in ('alive','dead','left','spectator')),
  x numeric not null default 5,
  y numeric not null default 50,
  is_host boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.players enable row level security;

drop policy if exists rooms_select_public on public.rooms;
drop policy if exists rooms_insert_public on public.rooms;
drop policy if exists rooms_update_public on public.rooms;
drop policy if exists rooms_delete_public on public.rooms;
drop policy if exists players_select_public on public.players;
drop policy if exists players_insert_public on public.players;
drop policy if exists players_update_public on public.players;
drop policy if exists players_delete_public on public.players;

create policy rooms_select_public on public.rooms for select using (true);
create policy rooms_insert_public on public.rooms for insert with check (true);
create policy rooms_update_public on public.rooms for update using (true) with check (true);
create policy rooms_delete_public on public.rooms for delete using (true);
create policy players_select_public on public.players for select using (true);
create policy players_insert_public on public.players for insert with check (true);
create policy players_update_public on public.players for update using (true) with check (true);
create policy players_delete_public on public.players for delete using (true);

alter table public.rooms replica identity full;
alter table public.players replica identity full;

-- Enable realtime for the two game tables.
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.players;
