-- ============================================================
-- SECFORIT Portal – Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Profiles table (public mirror of auth.users)
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. Row Level Security
alter table public.profiles enable row level security;

-- Users can only read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 3. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Keep updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- 5. User API Keys (server-side only — NOT exposed to clients)
-- ============================================================
-- This table has RLS enabled with NO client policies.
-- Only the service_role key (admin client) can read/write.
-- This prevents browser-side JS from ever accessing stored keys.

create table if not exists public.user_api_keys (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  anthropic_api_key text,
  openai_api_key    text,
  created_at        timestamptz default now() not null,
  updated_at        timestamptz default now() not null
);

-- Enable RLS but add NO policies — blocks all client (anon/authenticated) access.
-- Only the service_role bypasses RLS.
alter table public.user_api_keys enable row level security;

-- Auto-update timestamp
drop trigger if exists user_api_keys_set_updated_at on public.user_api_keys;
create trigger user_api_keys_set_updated_at
  before update on public.user_api_keys
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- Migration: Move API keys from profiles to user_api_keys
-- (run if upgrading from the previous schema)
-- ============================================================
-- INSERT INTO public.user_api_keys (user_id, anthropic_api_key, openai_api_key)
--   SELECT id, anthropic_api_key, openai_api_key FROM public.profiles
--   WHERE anthropic_api_key IS NOT NULL OR openai_api_key IS NOT NULL
--   ON CONFLICT (user_id) DO UPDATE SET
--     anthropic_api_key = EXCLUDED.anthropic_api_key,
--     openai_api_key = EXCLUDED.openai_api_key;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS anthropic_api_key;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS openai_api_key;
