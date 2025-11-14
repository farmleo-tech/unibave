-- Supabase schema (Postgres) - run in Supabase SQL Editor

create table if not exists schedules (
  id bigserial primary key,
  course text,
  discipline text,
  room text,
  created_at timestamptz default now()
);

create table if not exists imports (
  id bigserial primary key,
  payload jsonb,
  created_at timestamptz default now()
);

-- Create other tables as needed (rooms, classes, professors, import_errors).
-- Storage: create a bucket named 'public-logos' in Supabase Storage and make it public.
