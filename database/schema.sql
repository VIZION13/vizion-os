-- VIZION OS v2 — Supabase Schema
-- Run this in Supabase SQL Editor

-- Artists
create table if not exists artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar text,
  bio text,
  created_at timestamptz default now()
);

-- Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text,
  artist_id uuid references artists(id) on delete set null,
  description text,
  status text default 'draft',
  created_at timestamptz default now()
);

-- Memories (contexte IA)
create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text,
  created_at timestamptz default now()
);

-- Conversations (historique chat)
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  module text default 'vizion',
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

-- Tasks (admin)
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  done boolean default false,
  priority text default 'normal',
  due_date date,
  created_at timestamptz default now()
);

-- Songs (music)
create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  bpm integer,
  key text,
  prompt text,
  suno_url text,
  artist_id uuid references artists(id) on delete set null,
  created_at timestamptz default now()
);

-- Clips (clip)
create table if not exists clips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storyboard text,
  prompt text,
  artist_id uuid references artists(id) on delete set null,
  status text default 'draft',
  created_at timestamptz default now()
);

-- RLS : désactivé pour MVP, à activer en prod
alter table artists disable row level security;
alter table projects disable row level security;
alter table memories disable row level security;
alter table conversations disable row level security;
alter table tasks disable row level security;
alter table songs disable row level security;
alter table clips disable row level security;

-- Storage buckets (créer manuellement dans Supabase)
-- artists, clips, music, contracts, invoices, documents
