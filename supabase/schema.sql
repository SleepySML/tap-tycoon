-- ============================================
-- TAP TYCOON — Database Schema
--
-- Run this in your Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → Paste → Run
--
-- Tables:
--   profiles      — user display names and avatars
--   game_saves    — cloud save data (JSONB)
--   leaderboards  — public rankings
--
-- Security: Row-Level Security (RLS) ensures players
-- can only read/write their own data. Leaderboard is
-- publicly readable for competition.
-- ============================================

-- ==================
-- 1. PROFILES TABLE
-- ==================
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  display_name text not null default 'Player',
  avatar_url  text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ==================
-- 2. GAME SAVES TABLE
-- ==================
create table if not exists public.game_saves (
  user_id     uuid references auth.users on delete cascade primary key,
  save_data   jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.game_saves enable row level security;

create policy "Users can read own save"
  on public.game_saves for select
  using (auth.uid() = user_id);

create policy "Users can insert own save"
  on public.game_saves for insert
  with check (auth.uid() = user_id);

create policy "Users can update own save"
  on public.game_saves for update
  using (auth.uid() = user_id);

-- ==================
-- 3. LEADERBOARD TABLE
-- ==================
create table if not exists public.leaderboards (
  user_id         uuid references auth.users on delete cascade primary key,
  display_name    text not null default 'Player',
  total_earned    numeric not null default 0,
  prestiges       integer not null default 0,
  businesses_owned integer not null default 0,
  updated_at      timestamptz not null default now()
);

alter table public.leaderboards enable row level security;

-- Everyone can read leaderboard (public competition)
create policy "Anyone can read leaderboard"
  on public.leaderboards for select
  using (true);

create policy "Users can insert own leaderboard entry"
  on public.leaderboards for insert
  with check (auth.uid() = user_id);

create policy "Users can update own leaderboard entry"
  on public.leaderboards for update
  using (auth.uid() = user_id);

-- ==================
-- 4. AUTO-CREATE PROFILE ON SIGNUP
-- ==================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1),
      'Player'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

-- Drop existing trigger if any, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==================
-- 5. INDEXES
-- ==================
create index if not exists idx_leaderboards_total_earned
  on public.leaderboards (total_earned desc);

create index if not exists idx_game_saves_updated
  on public.game_saves (updated_at desc);
