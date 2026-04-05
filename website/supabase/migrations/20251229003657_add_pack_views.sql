create table if not exists public.pack_views (
    id uuid default gen_random_uuid() primary key,
    pack_id uuid references public.packs(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    -- Enforce one record per user per pack (nulls are distinct in Postgres, so anon views are allowed multiple times)
    unique(pack_id, user_id)
);

-- RLS
alter table public.pack_views enable row level security;

-- Allow anyone to insert (to track anonymous clicks if we wanted, but for now we might require auth or just allow all)
create policy "Anyone can insert views"
    on public.pack_views for insert
    with check (true);

-- Allow everyone to read counts
create policy "Anyone can read views"
    on public.pack_views for select
    using (true);

-- Index for performance
create index if not exists pack_views_pack_id_idx on public.pack_views(pack_id);
