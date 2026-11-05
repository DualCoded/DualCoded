-- dualcoded.supply database. Paste this whole file into Supabase > SQL Editor > Run.
-- Then put both of your emails in the admins table (last lines).

create table if not exists items (
  id           uuid primary key default gen_random_uuid(),
  side         text not null check (side in ('508','732')),
  title        text not null,
  brand        text default '',
  category     text default 'Other',
  size         text default '',
  condition    text default '',
  measurements text default '',
  price        numeric default 0,
  description  text default '',
  depop_url    text default '',
  photos       text[] default '{}',
  status       text not null default 'available' check (status in ('available','hold','sold','hidden')),
  featured     boolean default false,
  created_at   timestamptz default now(),
  sold_at      timestamptz
);

create table if not exists admins (email text primary key);

alter table items  enable row level security;
alter table admins enable row level security;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

-- Everyone can see listed items; only the two admins see hidden drafts or change anything.
drop policy if exists "public read" on items;
create policy "public read"  on items for select using (status <> 'hidden' or is_admin());
drop policy if exists "admin write" on items;
create policy "admin write" on items for all using (is_admin()) with check (is_admin());

-- Photo storage: public to view, only admins upload/delete.
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
  on conflict (id) do nothing;
drop policy if exists "photos admin insert" on storage.objects;
create policy "photos admin insert" on storage.objects for insert with check (bucket_id = 'photos' and is_admin());
drop policy if exists "photos admin update" on storage.objects;
create policy "photos admin update" on storage.objects for update using (bucket_id = 'photos' and is_admin());
drop policy if exists "photos admin delete" on storage.objects;
create policy "photos admin delete" on storage.objects for delete using (bucket_id = 'photos' and is_admin());

-- >>> EDIT THESE: the two emails you will sign in with <<<
insert into admins (email) values
  ('you@example.com'),
  ('roommate@example.com')
on conflict do nothing;
