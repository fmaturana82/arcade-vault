-- SPEC 06 — Catálogo y leaderboards: tablas games + scores, RLS de solo lectura y RPC top_players_today.

create table public.games (
  id          text primary key,
  title       text not null,
  short       text not null,
  long        text not null,
  cat         text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover       text not null,
  color       text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  best        integer not null default 0,
  plays       text not null default '0',
  sort_order  integer not null unique,
  created_at  timestamptz not null default now()
);

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 10),
  score       integer not null check (score >= 0),
  -- Siempre null hasta la spec de Auth.
  user_id     uuid null references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at);
create index scores_created_idx on public.scores (created_at desc);
create index scores_user_idx on public.scores (user_id);

-- RLS mínima de solo lectura. Las políticas por usuario llegan en una spec futura.
alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "games: lectura pública" on public.games
  for select to anon, authenticated using (true);

create policy "scores: lectura pública" on public.scores
  for select to anon, authenticated using (true);

-- Mejor puntuación individual de cada jugador desde las 00:00 UTC de hoy.
create or replace function public.top_players_today(p_limit integer default 5)
returns table (name text, score integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.name, max(s.score)::integer as score
  from public.scores s
  where s.created_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc')
  group by s.name
  order by score desc, s.name asc
  limit greatest(p_limit, 0);
$$;

grant execute on function public.top_players_today(integer) to anon, authenticated;
