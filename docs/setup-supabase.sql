-- Cutepad cloud sync schema (Supabase / Postgres)
-- Run this in the Supabase SQL editor, then paste the project URL + anon key
-- into Cutepad → Settings → Cloud sync.
--
-- 🔐 SECURITY MODEL — read before running:
-- * The tables below use demo-open RLS (`using (true)`): ANYONE with the anon key can
--   read/write EVERY row. This is only acceptable for personal, self-hosted use where
--   the anon key is treated like a password and never shared publicly.
-- * Share links embed the anon key in the URL (?k=…) — treat published notes as PUBLIC.
-- * Prefer the built-in Firebase sync (Settings → Cloud sync → Firebase): it uses
--   per-device anonymous auth + uid-scoped Firestore rules, so rows are isolated per
--   account (docs/firestore.rules).
-- * If you do self-host Supabase: never store sensitive data in your personal sync
--   project, and ROTATE the anon key (Supabase dashboard → Settings → API) if a share
--   link leaks — rotation invalidates old links, which is the intended recovery.

create table if not exists public.cutepad_docs (
  id          text primary key,
  owner       text not null,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

create index if not exists cutepad_docs_owner_idx
  on public.cutepad_docs (owner);

create table if not exists public.cutepad_buddies (
  pair_code   text primary key,
  payload     jsonb not null,
  updated_at  timestamptz not null default now()
);

-- V3: publicly shareable note pages (read via anon key embedded in the share link)
create table if not exists public.cutepad_public_notes (
  slug        text primary key,
  owner       text not null,
  title       text not null default 'Untitled note',
  html        text not null default '',
  text        text not null default '',
  tags        jsonb not null default '[]'::jsonb,
  color       text,
  updated_at  timestamptz not null default now()
);

create index if not exists cutepad_public_notes_owner_idx
  on public.cutepad_public_notes (owner);

-- V3: study-group presence + shared schedules, keyed by a group code
create table if not exists public.cutepad_group_presence (
  group_code  text not null,
  member      text not null,
  payload     jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (group_code, member)
);

alter table public.cutepad_docs             enable row level security;
alter table public.cutepad_buddies          enable row level security;
alter table public.cutepad_public_notes     enable row level security;
alter table public.cutepad_group_presence   enable row level security;

-- ⚠️ DEMO POLICIES — anyone with the anon key can read/write every row.
-- For a public deployment, replace `using (true)` with auth checks, e.g.:
--   create policy "own docs" on public.cutepad_docs
--     for all using (auth.uid()::text = owner) with check (auth.uid()::text = owner);

create policy "cutepad_docs_read"   on public.cutepad_docs for select using (true);
create policy "cutepad_docs_write"  on public.cutepad_docs for insert with check (true);
create policy "cutepad_docs_update" on public.cutepad_docs for update using (true);
create policy "cutepad_docs_delete" on public.cutepad_docs for delete using (true);

create policy "cutepad_buddies_read"   on public.cutepad_buddies for select using (true);
create policy "cutepad_buddies_write"  on public.cutepad_buddies for insert with check (true);
create policy "cutepad_buddies_update" on public.cutepad_buddies for update using (true);
create policy "cutepad_buddies_delete" on public.cutepad_buddies for delete using (true);

create policy "cutepad_public_notes_read"   on public.cutepad_public_notes for select using (true);
create policy "cutepad_public_notes_write"  on public.cutepad_public_notes for insert with check (true);
create policy "cutepad_public_notes_update" on public.cutepad_public_notes for update using (true);
create policy "cutepad_public_notes_delete" on public.cutepad_public_notes for delete using (true);

create policy "cutepad_group_presence_read"   on public.cutepad_group_presence for select using (true);
create policy "cutepad_group_presence_write"  on public.cutepad_group_presence for insert with check (true);
create policy "cutepad_group_presence_update" on public.cutepad_group_presence for update using (true);
create policy "cutepad_group_presence_delete" on public.cutepad_group_presence for delete using (true);

grant select, insert, update, delete on public.cutepad_docs           to anon, authenticated;
grant select, insert, update, delete on public.cutepad_buddies        to anon, authenticated;
grant select, insert, update, delete on public.cutepad_public_notes   to anon, authenticated;
grant select, insert, update, delete on public.cutepad_group_presence to anon, authenticated;

-- 📌 Sharing notes: a share link looks like https://your-host/#/share/<slug>?s=<url>&k=<anonKey>.
-- The anon key travels inside the link, so treat published notes as PUBLIC — anyone with
-- the link (and its key) can read that one row. Rotate keys before production use.
